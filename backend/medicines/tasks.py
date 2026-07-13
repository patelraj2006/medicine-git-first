import os
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from .models import Medicine, MedicineSchedule, ReminderLog, AdherenceLog, NotificationLog

@shared_task
def send_medicine_reminder():
    """
    Main periodic task scheduled (e.g. every minute) to:
    1. Mark pending doses older than 2 hours as 'Missed'.
    2. Find pending doses that are due now (within the current time window) and dispatch reminders.
    """
    now = timezone.now()
    
    # 1. Auto-mark missed doses
    missed_threshold = now - timedelta(hours=2)
    missed_schedules = MedicineSchedule.objects.filter(
        status="Pending",
        scheduled_time__lt=missed_threshold
    )
    for sched in missed_schedules:
        sched.status = "Missed"
        sched.save(update_fields=['status', 'taken_at'])
        
        # Log adherence state
        AdherenceLog.objects.update_or_create(
            schedule=sched,
            defaults={
                'user': sched.medicine.user,
                'medicine': sched.medicine,
                'status': "Missed",
                'logged_at': timezone.now()
            }
        )

    # 2. Find pending schedules that are due (scheduled_time <= now and in last 2 hours)
    due_schedules = MedicineSchedule.objects.filter(
        status="Pending",
        scheduled_time__lte=now,
        scheduled_time__gte=missed_threshold
    )

    for sched in due_schedules:
        # Check if reminder already logged
        already_sent = ReminderLog.objects.filter(schedule=sched, status="Sent").exists()
        if not already_sent:
            # Create Reminder Log
            ReminderLog.objects.create(schedule=sched, status="Sent")
            
            # Trigger notifications
            send_email_notification.delay(sched.id)
            send_sms_notification.delay(sched.id)


@shared_task
def send_email_notification(schedule_id):
    try:
        sched = MedicineSchedule.objects.get(id=schedule_id)
        patient = sched.medicine.patient
        med = sched.medicine
        
        subject = f"MedKeep Reminder: Take your {med.medicine_name}"
        message = f"Time to take your {med.medicine_name} {med.dosage} dose."
        recipient = patient.email
        
        # In development, console email backend is used (defined in settings)
        send_mail(
            subject,
            message,
            os.getenv('EMAIL_HOST_USER', 'reminders@medkeep.com'),
            [recipient],
            fail_silently=False,
        )
        
        NotificationLog.objects.create(
            schedule=sched,
            notification_type="Email",
            recipient=recipient,
            status="Sent"
        )
    except Exception as e:
        # Get sched if it exists to log failure
        try:
            sched = MedicineSchedule.objects.get(id=schedule_id)
            NotificationLog.objects.create(
                schedule=sched,
                notification_type="Email",
                recipient=sched.medicine.patient.email,
                status="Failed",
                error_message=str(e)
            )
        except Exception:
            pass


@shared_task
def send_sms_notification(schedule_id):
    try:
        sched = MedicineSchedule.objects.get(id=schedule_id)
        patient = sched.medicine.patient
        med = sched.medicine
        
        recipient_phone = patient.phone
        msg_body = f"Time to take your {med.medicine_name} {med.dosage} dose."

        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if account_sid and auth_token and from_number:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            client.messages.create(
                body=msg_body,
                from_=from_number,
                to=recipient_phone
            )
            status = "Sent"
            err_msg = None
        else:
            status = "Logged"
            err_msg = "Twilio credentials not configured. SMS logged to console."
            print(f"[SMS Console Log] To: {recipient_phone} | Msg: {msg_body}")

        NotificationLog.objects.create(
            schedule=sched,
            notification_type="SMS",
            recipient=recipient_phone,
            status=status,
            error_message=err_msg
        )
    except Exception as e:
        try:
            sched = MedicineSchedule.objects.get(id=schedule_id)
            NotificationLog.objects.create(
                schedule=sched,
                notification_type="SMS",
                recipient=sched.medicine.patient.phone,
                status="Failed",
                error_message=str(e)
            )
        except Exception:
            pass


@shared_task
def check_refill_alerts():
    """
    Check pill stock levels daily and send warning notifications
    """
    medicines = Medicine.objects.all()
    for med in medicines:
        if med.remaining_pills <= med.refill_threshold:
            subject = f"MedKeep Alert: Refill needed for {med.medicine_name}"
            message = f"Refill needed for {med.medicine_name}. Only {med.remaining_pills} pills left."
            recipient = med.patient.email
            
            # Send warning email
            try:
                send_mail(
                    subject,
                    message,
                    os.getenv('EMAIL_HOST_USER', 'alerts@medkeep.com'),
                    [recipient],
                    fail_silently=False,
                )
                print(f"[Refill Alert Log] Sent refill warning to {recipient} for {med.medicine_name}")
            except Exception as e:
                print(f"[Refill Alert Error] Failed sending warning to {recipient}: {e}")
