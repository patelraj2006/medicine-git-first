# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework.test import APITestCase
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from django.contrib.auth.models import User
from datetime import timedelta
from .models import Patient, Medicine, MedicineSchedule, AdherenceLog


class MedicineReminderTests(APITestCase):

    def setUp(self):
        # Create a user and authenticate the client
        self.user = User.objects.create_user(username="testuser", password="testpassword")
        self.client.force_authenticate(user=self.user)
        
        from .models import UserProfile
        UserProfile.objects.create(user=self.user, role="Doctor")
        
        # Create a test patient
        self.patient = Patient.objects.create(
            doctor=self.user,
            full_name="Alice Smith",
            email="alice@example.com",
            phone="1234567890"
        )

    def test_create_patient(self):
        url = "/api/patients/"
        data = {
            "full_name": "Bob Johnson",
            "email": "bob@example.com",
            "phone": "0987654321"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 2)

    def test_medicine_creation_generates_schedules(self):
        url = "/api/medicines/"
        # We set start_date in the future so schedules are in the future and generated
        start_date = timezone.now().date() + timedelta(days=1)
        end_date = start_date + timedelta(days=2) # 3 days total
        data = {
            "patient": self.patient.id,
            "medicine_name": "Ibuprofen",
            "dosage": "200mg",
            "frequency": "Twice Daily",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reminder_time": "08:00,20:00",
            "refill_threshold": 2
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify medicine created
        self.assertEqual(Medicine.objects.count(), 1)
        medicine = Medicine.objects.first()
        self.assertEqual(medicine.medicine_name, "Ibuprofen")
        
        # Verify 2 times/day * 3 days = 6 schedules generated
        self.assertEqual(MedicineSchedule.objects.count(), 6)
        
        # Verify all schedules are initially Pending
        pending_count = MedicineSchedule.objects.filter(status="Pending").count()
        self.assertEqual(pending_count, 6)

    def test_mark_schedule_taken_logs_adherence(self):
        # Create medicine manually
        medicine = Medicine.objects.create(
            patient=self.patient,
            user=self.user,
            medicine_name="Aspirin",
            dosage="100mg",
            frequency="Once Daily",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=1)
        )
        
        # Manually create schedules to test the view updates
        schedule = MedicineSchedule.objects.create(
            medicine=medicine,
            scheduled_time=timezone.now() + timedelta(hours=1),
            status="Pending"
        )
        
        # Verify no adherence records exist
        self.assertEqual(AdherenceLog.objects.count(), 0)
        
        url = f"/api/schedules/{schedule.id}/"
        data = {
            "status": "Taken"
        }
        
        # Mark schedule as Taken via patch
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify schedule is updated
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, "Taken")
        self.assertIsNotNone(schedule.taken_at)
        
        # Verify adherence is logged automatically
        self.assertEqual(AdherenceLog.objects.count(), 1)
        adherence = AdherenceLog.objects.first()
        self.assertEqual(adherence.status, "Taken")
        self.assertEqual(adherence.user, self.user)
        self.assertEqual(adherence.medicine, medicine)

    def test_duplicate_taken_saves_dont_double_decrement_pills(self):
        # Create medicine manually
        medicine = Medicine.objects.create(
            patient=self.patient,
            user=self.user,
            medicine_name="Aspirin",
            dosage="100mg",
            frequency="Once Daily",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=1),
            remaining_pills=30
        )
        
        schedule = MedicineSchedule.objects.create(
            medicine=medicine,
            scheduled_time=timezone.now() + timedelta(hours=1),
            status="Pending"
        )
        
        # Mark as Taken (first save)
        schedule.status = "Taken"
        schedule.save()
        medicine.refresh_from_db()
        self.assertEqual(medicine.remaining_pills, 29)
        
        # Duplicate save with Taken
        schedule.save()
        medicine.refresh_from_db()
        self.assertEqual(medicine.remaining_pills, 29) # Should NOT be 28!

    def test_revert_taken_to_pending_restores_pills_and_deletes_adherence(self):
        medicine = Medicine.objects.create(
            patient=self.patient,
            user=self.user,
            medicine_name="Aspirin",
            dosage="100mg",
            frequency="Once Daily",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=1),
            remaining_pills=30
        )
        
        schedule = MedicineSchedule.objects.create(
            medicine=medicine,
            scheduled_time=timezone.now() + timedelta(hours=1),
            status="Pending"
        )
        
        # Mark as Taken
        schedule.status = "Taken"
        schedule.save()
        medicine.refresh_from_db()
        self.assertEqual(medicine.remaining_pills, 29)
        self.assertEqual(AdherenceLog.objects.count(), 1)
        
        # Revert to Pending
        schedule.status = "Pending"
        schedule.save()
        medicine.refresh_from_db()
        self.assertEqual(medicine.remaining_pills, 30) # Pill restored
        self.assertEqual(AdherenceLog.objects.count(), 0) # Log deleted

    def test_create_medicine_invalid_data(self):
        url = "/api/medicines/"
        data = {
            "patient": self.patient.id,
            "medicine_name": "", # Invalid empty name
            "dosage": "500mg"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_extract_prescription_validation(self):
        url = "/api/extract-medication/"
        data = {"text": ""} # Invalid empty text
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_manage_other_doctor_patient_medicine(self):
        # Create another doctor and patient
        other_doctor = User.objects.create_user(username="other_doc", password="password")
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=other_doctor, defaults={'role': 'Doctor'})
        
        other_patient = Patient.objects.create(
            doctor=other_doctor,
            full_name="Bob Jones",
            email="bob@example.com",
            phone="9876543210"
        )
        
        url = "/api/medicines/"
        data = {
            "patient": other_patient.id,
            "medicine_name": "Lipitor",
            "dosage": "10mg",
            "frequency": "Once Daily",
            "start_date": timezone.now().date().isoformat(),
            "end_date": (timezone.now().date() + timedelta(days=5)).isoformat(),
            "reminder_time": "08:00"
        }
        
        # Logged in as self.user (doctor), but trying to add medicine to other_patient (managed by other_doctor)
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", response.data)

    def test_doctor_cannot_send_notification_to_other_doctor_patient(self):
        other_doctor = User.objects.create_user(username="other_doc2", password="password")
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=other_doctor, defaults={'role': 'Doctor'})
        
        other_patient = Patient.objects.create(
            doctor=other_doctor,
            full_name="Bob Jones 2",
            email="bob2@example.com",
            phone="9876543210"
        )
        
        url = "/api/notifications/"
        data = {
            "patient": other_patient.id,
            "message": "Hello from Doctor A"
        }
        
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", response.data)

    def test_patient_cannot_update_non_status_fields_on_schedule(self):
        # Create patient user and patient profile
        patient_user = User.objects.create_user(username="patient_user", password="password")
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=patient_user, defaults={'role': 'Patient'})
        
        self.patient.patient_user = patient_user
        self.patient.save()
        
        medicine = Medicine.objects.create(
            patient=self.patient,
            user=self.user,
            medicine_name="Aspirin",
            dosage="100mg",
            frequency="Once Daily",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=1)
        )
        
        schedule = MedicineSchedule.objects.create(
            medicine=medicine,
            scheduled_time=timezone.now() + timedelta(hours=1),
            status="Pending"
        )
        
        # Authenticate client as patient_user
        self.client.force_authenticate(user=patient_user)
        
        url = f"/api/schedules/{schedule.id}/"
        
        # Try to modify status - should succeed
        response = self.client.patch(url, {"status": "Taken"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to modify scheduled_time - should fail
        response = self.client.patch(url, {"scheduled_time": (timezone.now() + timedelta(days=5)).isoformat()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patient_cannot_view_other_patients_medicines(self):
        # Create patient user A and associate with self.patient
        patient_user_a = User.objects.create_user(username="patient_a", password="password")
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=patient_user_a, defaults={'role': 'Patient'})
        self.patient.patient_user = patient_user_a
        self.patient.save()
        
        # Create patient user B
        patient_user_b = User.objects.create_user(username="patient_b", password="password")
        UserProfile.objects.get_or_create(user=patient_user_b, defaults={'role': 'Patient'})
        
        other_patient = Patient.objects.create(
            doctor=self.user,
            patient_user=patient_user_b,
            full_name="Patient B",
            email="b@example.com",
            phone="123456789"
        )
        
        # Create medicines for both patients
        med_a = Medicine.objects.create(
            patient=self.patient,
            user=self.user,
            medicine_name="Aspirin",
            dosage="100mg"
        )
        med_b = Medicine.objects.create(
            patient=other_patient,
            user=self.user,
            medicine_name="Lipitor",
            dosage="10mg"
        )
        
        # Login as patient A, list medicines. Should NOT see med_b.
        self.client.force_authenticate(user=patient_user_a)
        response = self.client.get("/api/medicines/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        med_ids = [m["id"] for m in response.data]
        self.assertIn(med_a.id, med_ids)
        self.assertNotIn(med_b.id, med_ids)

    def test_unauthenticated_user_access(self):
        self.client.force_authenticate(user=None)
        
        urls = [
            "/api/dashboard/",
            "/api/medicines/",
            "/api/schedules/",
            "/api/notifications/"
        ]
        
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
