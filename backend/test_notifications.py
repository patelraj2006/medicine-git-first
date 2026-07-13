import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from medicines.models import Patient, Notification, UserProfile
from rest_framework.test import APIClient
from rest_framework import status

def test_flow():
    # Get or create doctor
    doctor, _ = User.objects.get_or_create(username='test_doc_user')
    UserProfile.objects.get_or_create(user=doctor, defaults={'role': 'Doctor'})
    
    # Get or create patient user
    patient_user, _ = User.objects.get_or_create(username='test_pat_user')
    UserProfile.objects.get_or_create(user=patient_user, defaults={'role': 'Patient'})
    
    # Create patient record
    patient, _ = Patient.objects.get_or_create(
        doctor=doctor,
        email='test_pat@example.com',
        defaults={
            'patient_user': patient_user,
            'full_name': 'Test Patient Flow',
            'phone': '1234567890'
        }
    )
    
    # 1. Test POST notification as doctor
    client = APIClient()
    client.force_authenticate(user=doctor)
    
    response = client.post('/api/notifications/', {
        'patient': patient.id,
        'message': 'Test message from doc'
    }, format='json')
    print('POST Notification Status:', response.status_code)
    print('POST Response:', response.data)
    
    if response.status_code != status.HTTP_201_CREATED:
        print('POST FAILED!')
        return
        
    notif_id = response.data['id']
    
    # 2. Test GET notifications as patient
    client.force_authenticate(user=patient_user)
    response = client.get('/api/notifications/')
    print('GET Notifications Status:', response.status_code)
    print('GET Response:', response.data)
    
    # 3. Test PATCH notification (mark as read) as patient
    response = client.patch(f'/api/notifications/{notif_id}/', {
        'is_read': True
    }, format='json')
    print('PATCH Notification Status:', response.status_code)
    print('PATCH Response:', response.data)

if __name__ == '__main__':
    test_flow()
