import os
import sys
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from django.contrib.auth.models import User
from medicines.models import UserProfile, Patient

print("=" * 55)
print("  MedKeep - Creating Demo Login Accounts")
print("=" * 55)

# -- 1. Demo Doctor --
doctor_username = "doctor"
doctor_password = "Doctor@123"
doctor_email    = "doctor@medkeep.com"

doctor, created = User.objects.get_or_create(username=doctor_username)
doctor.set_password(doctor_password)
doctor.email      = doctor_email
doctor.first_name = "Dr. Arjun"
doctor.last_name  = "Mehta"
doctor.save()

UserProfile.objects.update_or_create(user=doctor, defaults={"role": "Doctor"})

status_msg = "CREATED" if created else "UPDATED (password reset)"
print(f"\n[OK] Doctor account {status_msg}")
print(f"   Username : {doctor_username}")
print(f"   Password : {doctor_password}")
print(f"   Role     : Doctor")

# -- 2. Demo Patient --
patient_username = "patient"
patient_password = "Patient@123"
patient_email    = "patient@medkeep.com"

patient_user, created = User.objects.get_or_create(username=patient_username)
patient_user.set_password(patient_password)
patient_user.email      = patient_email
patient_user.first_name = "Riya"
patient_user.last_name  = "Sharma"
patient_user.save()

UserProfile.objects.update_or_create(user=patient_user, defaults={"role": "Patient"})

# Link patient profile under the demo doctor
patient_profile, _ = Patient.objects.get_or_create(
    doctor=doctor,
    email=patient_email,
    defaults={
        "patient_user": patient_user,
        "full_name": "Riya Sharma",
        "phone": "9876543210",
    }
)
if patient_profile.patient_user != patient_user:
    patient_profile.patient_user = patient_user
    patient_profile.save()

status_msg = "CREATED" if created else "UPDATED (password reset)"
print(f"\n[OK] Patient account {status_msg}")
print(f"   Username : {patient_username}")
print(f"   Password : {patient_password}")
print(f"   Role     : Patient")

# -- 3. Admin / Superuser --
admin_username = "admin"
admin_password = "Admin@123"

admin, created = User.objects.get_or_create(username=admin_username)
admin.set_password(admin_password)
admin.is_staff     = True
admin.is_superuser = True
admin.email        = "admin@medkeep.com"
admin.save()

UserProfile.objects.update_or_create(user=admin, defaults={"role": "Doctor"})

status_msg = "CREATED" if created else "UPDATED (password reset)"
print(f"\n[OK] Admin account {status_msg}")
print(f"   Username : {admin_username}")
print(f"   Password : {admin_password}")
print(f"   Role     : Admin / Doctor")

print("\n" + "=" * 55)
print("  All accounts ready! Open http://localhost:5173/login")
print("=" * 55)
