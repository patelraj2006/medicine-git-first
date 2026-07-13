from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('Doctor', 'Doctor'),
        ('Patient', 'Patient'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Patient')
    phone = models.CharField(max_length=20, null=True, blank=True)
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Patient(models.Model):
    doctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="patients_created"
    )
    patient_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_profiles"
    )
    full_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    class Meta:
        unique_together = ('doctor', 'email')

    def __str__(self):
        return f"{self.full_name} (managed by {self.doctor.username})"


class Medicine(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="medicines"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="all_medicines"
    )
    medicine_name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50, default="Once Daily") # e.g. Once Daily, Twice Daily, Three Times Daily, Weekly, Custom Schedule
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(default=timezone.now)
    reminder_time = models.CharField(max_length=100, default="09:00", help_text="Comma-separated times, e.g. 09:00,21:00")
    notes = models.TextField(null=True, blank=True)
    total_pills = models.IntegerField(default=30)
    remaining_pills = models.IntegerField(default=30)
    refill_threshold = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage}"


class MedicineSchedule(models.Model):
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    scheduled_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        default="Pending" # Pending, Taken, Missed, Skipped
    )
    taken_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def save(self, *args, **kwargs):
        old_status = None
        if self.pk:
            try:
                old_status = MedicineSchedule.objects.get(pk=self.pk).status
            except MedicineSchedule.DoesNotExist:
                pass

        is_taken = self.status == "Taken"
        if is_taken and not self.taken_at:
            self.taken_at = timezone.now()
        elif self.status != "Taken":
            self.taken_at = None
            
        super().save(*args, **kwargs)
        
        # Log to AdherenceLog automatically when status changes from Pending
        if self.status in ["Taken", "Missed", "Skipped"]:
            AdherenceLog.objects.update_or_create(
                schedule=self,
                defaults={
                    'user': self.medicine.user,
                    'medicine': self.medicine,
                    'status': self.status,
                    'logged_at': timezone.now()
                }
            )

            # If transitioning to Taken, decrement remaining pills count
            if self.status == "Taken" and old_status != "Taken":
                med = self.medicine
                if med.remaining_pills > 0:
                    med.remaining_pills = max(0, med.remaining_pills - 1)
                    med.save(update_fields=['remaining_pills'])
        elif self.status == "Pending":
            # Reversion to Pending deletes adherence log
            AdherenceLog.objects.filter(schedule=self).delete()

        # If transitioning from Taken to another status, increment remaining pills count (revert)
        if old_status == "Taken" and self.status != "Taken":
            med = self.medicine
            med.remaining_pills = min(med.total_pills, med.remaining_pills + 1)
            med.save(update_fields=['remaining_pills'])

    def __str__(self):
        return f"{self.medicine.medicine_name} scheduled at {self.scheduled_time}"


class ReminderLog(models.Model):
    schedule = models.ForeignKey(
        MedicineSchedule,
        on_delete=models.CASCADE,
        related_name="reminder_logs"
    )
    reminder_time = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default="Sent") # Sent, Failed

    def __str__(self):
        return f"Reminder for {self.schedule.medicine.medicine_name} at {self.reminder_time}"


class AdherenceLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    schedule = models.OneToOneField(
        MedicineSchedule, 
        on_delete=models.CASCADE,
        related_name="adherence_log"
    )
    status = models.CharField(max_length=20) # Taken, Missed, Skipped
    logged_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.medicine.medicine_name} - {self.status} on {self.logged_at.date()}"


class NotificationLog(models.Model):
    schedule = models.ForeignKey(
        MedicineSchedule,
        on_delete=models.CASCADE,
        related_name="notification_logs"
    )
    notification_type = models.CharField(max_length=20) # Email, SMS, Push
    recipient = models.CharField(max_length=100)
    sent_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default="Sent") # Sent, Failed
    error_message = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.notification_type} to {self.recipient} - {self.status}"


class Notification(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    doctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_notifications"
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.patient.full_name} from {self.doctor.username}"