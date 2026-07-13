import re
import json
import os
import random
from datetime import datetime, time, timedelta
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import generics, status, viewsets
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny, IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Count, Q

from .models import (
    Patient,
    Medicine,
    MedicineSchedule,
    ReminderLog,
    AdherenceLog,
    NotificationLog,
    Notification,
    UserProfile
)

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    PatientSerializer,
    MedicineSerializer,
    MedicineScheduleSerializer,
    AdherenceLogSerializer,
    NotificationSerializer
)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user.email:
                Patient.objects.filter(email__iexact=user.email).update(patient_user=user)
            refresh = RefreshToken.for_user(user)
            return Response({
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = authenticate(username=username, password=password)
        if user is not None:
            if user.email:
                Patient.objects.filter(email__iexact=user.email).update(patient_user=user)
            refresh = RefreshToken.for_user(user)
            return Response({
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            })
        return Response({"error": "Invalid Credentials"}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        user.email = request.data.get("email", user.email)
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        if request.data.get("password"):
            user.set_password(request.data.get("password"))
        user.save()
        return Response(UserSerializer(user).data)


class PatientListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            return Patient.objects.filter(doctor=user)
        elif role == 'Patient':
            return Patient.objects.filter(patient_user=user)
        return Patient.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        patient = serializer.save(doctor=user)
        # Check if user exists (case-insensitive)
        existing_user = User.objects.filter(email__iexact=patient.email).first()
        if existing_user:
            patient.patient_user = existing_user
            patient.save()
        else:
            # Auto-create User account
            username = patient.email.split('@')[0] + str(patient.id)
            new_user = User.objects.create_user(
                username=username,
                email=patient.email,
                password="Patient123!",
                first_name=patient.full_name.split()[0] if patient.full_name else "",
                last_name=" ".join(patient.full_name.split()[1:]) if patient.full_name else ""
            )
            from .models import UserProfile
            UserProfile.objects.create(user=new_user, role="Patient")
            patient.patient_user = new_user
            patient.save()


class PatientRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PatientSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            return Patient.objects.filter(doctor=user)
        elif role == 'Patient':
            return Patient.objects.filter(patient_user=user)
        return Patient.objects.none()


class MedicineListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            queryset = Medicine.objects.filter(user=user)
            patient_id = self.request.query_params.get("patient")
            if patient_id:
                queryset = queryset.filter(patient_id=patient_id)
            return queryset
        elif role == 'Patient':
            return Medicine.objects.filter(patient__patient_user=user)
        return Medicine.objects.none()

    def perform_create(self, serializer):
        medicine = serializer.save(user=self.request.user)
        self.generate_schedules(medicine)

    def generate_schedules(self, medicine):
        # Remove any existing pending schedules first
        MedicineSchedule.objects.filter(medicine=medicine, status="Pending").delete()

        # Parse times from comma-separated string e.g. "08:00,20:00"
        times_list = []
        for t_str in medicine.reminder_time.split(','):
            try:
                h, m = map(int, t_str.strip().split(':'))
                times_list.append(time(h, m))
            except ValueError:
                continue

        if not times_list:
            times_list = [time(9, 0)] # Fallback

        start_date = medicine.start_date
        end_date = medicine.end_date
        
        current_date = start_date
        while current_date <= end_date:
            # If frequency is "Weekly", only schedule on the start_date weekday
            if medicine.frequency == "Weekly" and current_date.weekday() != start_date.weekday():
                current_date += timedelta(days=1)
                continue

            for t in times_list:
                reminder_datetime = timezone.make_aware(datetime.combine(current_date, t))
                # Skip if the scheduled time is in the past
                if reminder_datetime > timezone.now():
                    MedicineSchedule.objects.create(
                        medicine=medicine,
                        scheduled_time=reminder_datetime,
                        status="Pending"
                    )
            current_date += timedelta(days=1)


class MedicineRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MedicineSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            return Medicine.objects.filter(user=user)
        elif role == 'Patient':
            return Medicine.objects.filter(patient__patient_user=user)
        return Medicine.objects.none()

    def perform_update(self, serializer):
        medicine = serializer.save()
        # Regenerate schedules on update
        # (This updates future schedules to reflect modified times or start/end dates)
        # We preserve taken/missed schedules, but regenerate pending ones
        # For simplicity, we regenerate pending ones in this helper:
        self.regenerate_pending_schedules(medicine)

    def regenerate_pending_schedules(self, medicine):
        # Delete pending schedules in the future
        MedicineSchedule.objects.filter(medicine=medicine, status="Pending", scheduled_time__gt=timezone.now()).delete()
        
        times_list = []
        for t_str in medicine.reminder_time.split(','):
            try:
                h, m = map(int, t_str.strip().split(':'))
                times_list.append(time(h, m))
            except ValueError:
                continue

        if not times_list:
            times_list = [time(9, 0)]

        current_date = max(medicine.start_date, timezone.now().date())
        while current_date <= medicine.end_date:
            if medicine.frequency == "Weekly" and current_date.weekday() != medicine.start_date.weekday():
                current_date += timedelta(days=1)
                continue

            for t in times_list:
                reminder_datetime = timezone.make_aware(datetime.combine(current_date, t))
                if reminder_datetime > timezone.now():
                    # Check if schedule already exists (to avoid duplicate taken/missed ones)
                    exists = MedicineSchedule.objects.filter(medicine=medicine, scheduled_time=reminder_datetime).exists()
                    if not exists:
                        MedicineSchedule.objects.create(
                            medicine=medicine,
                            scheduled_time=reminder_datetime,
                            status="Pending"
                        )
            current_date += timedelta(days=1)


class ScheduleListView(generics.ListAPIView):
    serializer_class = MedicineScheduleSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            queryset = MedicineSchedule.objects.filter(medicine__user=user)
        elif role == 'Patient':
            queryset = MedicineSchedule.objects.filter(medicine__patient__patient_user=user)
        else:
            queryset = MedicineSchedule.objects.none()
        patient_id = self.request.query_params.get("patient")
        medicine_id = self.request.query_params.get("medicine")
        status_filter = self.request.query_params.get("status")
        
        if patient_id:
            queryset = queryset.filter(medicine__patient_id=patient_id)
        if medicine_id:
            queryset = queryset.filter(medicine_id=medicine_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.order_list_or_default() if hasattr(queryset, 'order_list_or_default') else queryset.order_by("scheduled_time")


class ScheduleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MedicineScheduleSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            return MedicineSchedule.objects.filter(medicine__user=user)
        elif role == 'Patient':
            return MedicineSchedule.objects.filter(medicine__patient__patient_user=user)
        return MedicineSchedule.objects.none()


class AdherenceListView(generics.ListAPIView):
    serializer_class = AdherenceLogSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            queryset = AdherenceLog.objects.filter(user=user)
        elif role == 'Patient':
            queryset = AdherenceLog.objects.filter(medicine__patient__patient_user=user)
        else:
            queryset = AdherenceLog.objects.none()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(medicine__patient_id=patient_id)
        return queryset.order_by("-logged_at")


class ExtractMedicationView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        text = request.data.get("text", "")
        if not text:
            return Response({"error": "No text provided"}, status=400)

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return self.fallback_extraction(text)

        try:
            # pyrefly: ignore [missing-import]
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            prompt = f"Extract medicine details from this instruction: '{text}'"
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional medical assistant chatbot. Extract prescription info in a structured JSON output. Keys must be exactly: 'medicine_name' (string), 'dosage' (string, e.g. '500mg' or '1 pill'), 'frequency' (string: 'Once Daily', 'Twice Daily', 'Three Times Daily', 'Weekly', or 'Custom Schedule'), 'duration' (integer representing number of days), and 'timing' (string, e.g. 'after food', 'before sleep')."
                    },
                    {"role": "user", "content": prompt}
                ]
            )
            result = json.loads(response.choices[0].message.content)
            # Standardize default fields
            if "frequency" not in result:
                result["frequency"] = "Once Daily"
            if "duration" not in result:
                result["duration"] = 7
            return Response(result)
        except Exception as e:
            return self.fallback_extraction(text, error=str(e))

    def fallback_extraction(self, text, error=None):
        text_lower = text.lower()
        medicine_name = "Paracetamol"
        dosage = "500mg"
        frequency = "Once Daily"
        duration = 7
        timing = "after food"

        med_keywords = ["aspirin", "paracetamol", "ibuprofen", "amoxicillin", "lipitor", "metformin"]
        for med in med_keywords:
            if med in text_lower:
                medicine_name = med.capitalize()
                break

        dosage_match = re.search(r'\d+(?:mg|g|ml|mcg|pills|pills)', text_lower)
        if dosage_match:
            dosage = dosage_match.group(0)

        if "twice" in text_lower or "double" in text_lower or "2 times" in text_lower or "twice daily" in text_lower:
            frequency = "Twice Daily"
        elif "three" in text_lower or "thrice" in text_lower or "3 times" in text_lower or "three times daily" in text_lower:
            frequency = "Three Times Daily"
        elif "weekly" in text_lower or "week" in text_lower:
            frequency = "Weekly"

        duration_match = re.search(r'(\d+)\s*days', text_lower)
        if duration_match:
            duration = int(duration_match.group(1))

        if "before" in text_lower:
            timing = "before food"
        elif "after" in text_lower:
            timing = "after food"
        elif "sleep" in text_lower or "night" in text_lower:
            timing = "before sleep"

        return Response({
            "medicine_name": medicine_name,
            "dosage": dosage,
            "frequency": frequency,
            "duration": duration,
            "timing": timing,
            "warning": "Rule-based fallback used. " + (error if error else "")
        })


class DashboardView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        patient_id = request.query_params.get("patient")
        user = request.user
        role = getattr(user, 'profile', None) and user.profile.role

        if role == 'Doctor':
            if not patient_id:
                return Response({"error": "Patient ID is required for doctors"}, status=400)
            medicines = Medicine.objects.filter(user=user, patient_id=patient_id)
            schedules = MedicineSchedule.objects.filter(medicine__user=user, medicine__patient_id=patient_id)
        elif role == 'Patient':
            medicines = Medicine.objects.filter(patient__patient_user=user)
            schedules = MedicineSchedule.objects.filter(medicine__patient__patient_user=user)
        else:
            medicines = Medicine.objects.none()
            schedules = MedicineSchedule.objects.none()

        # Calculations
        total_medicines = medicines.count()
        
        # Today's schedules range
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_schedules = schedules.filter(scheduled_time__range=(today_start, today_end))
        today_doses_count = today_schedules.count()
        
        # Missed and pending
        missed_doses_count = schedules.filter(status="Missed").count()
        upcoming_reminders = schedules.filter(status="Pending", scheduled_time__gt=timezone.now()).order_by("scheduled_time")[:5]
        
        # Adherence Rate
        total_logged = schedules.exclude(status="Pending").count()
        taken_count = schedules.filter(status="Taken").count()
        adherence_percentage = int((taken_count / total_logged) * 100) if total_logged > 0 else 100

        # Refill warning
        # A refill is needed if remaining pills <= 5
        refill_needed_medicines = [
            {
                "id": med.id,
                "medicine_name": med.medicine_name,
                "remaining_pills": med.remaining_pills,
                "total_pills": med.total_pills
            }
            for med in medicines
            if med.remaining_pills <= med.refill_threshold
        ]

        # Charts Data - Weekly Adherence (last 7 days)
        weekly_adherence = []
        for i in range(6, -1, -1):
            date = timezone.now().date() - timedelta(days=i)
            day_schedules = schedules.filter(scheduled_time__date=date)
            total_day = day_schedules.exclude(status="Pending").count()
            taken_day = day_schedules.filter(status="Taken").count()
            rate = int((taken_day / total_day) * 100) if total_day > 0 else 100
            weekly_adherence.append({
                "day": date.strftime("%a"),
                "adherence": rate
            })

        # Monthly Adherence (last 4 weeks)
        monthly_adherence = []
        for i in range(3, -1, -1):
            start = timezone.now() - timedelta(weeks=i+1)
            end = timezone.now() - timedelta(weeks=i)
            range_schedules = schedules.filter(scheduled_time__range=(start, end))
            total_range = range_schedules.exclude(status="Pending").count()
            taken_range = range_schedules.filter(status="Taken").count()
            rate = int((taken_range / total_range) * 100) if total_range > 0 else 100
            monthly_adherence.append({
                "week": f"Week {4-i}",
                "adherence": rate
            })

        return Response({
            "total_medicines": total_medicines,
            "today_doses": today_doses_count,
            "missed_doses": missed_doses_count,
            "adherence_percentage": adherence_percentage,
            "upcoming_reminders": MedicineScheduleSerializer(upcoming_reminders, many=True).data,
            "refill_alerts": refill_needed_medicines,
            "charts": {
                "weekly": weekly_adherence,
                "monthly": monthly_adherence
            }
        })


class NotificationListCreateView(generics.ListCreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            queryset = Notification.objects.filter(doctor=user)
            patient_id = self.request.query_params.get("patient")
            if patient_id:
                queryset = queryset.filter(patient_id=patient_id)
            return queryset.order_by("-created_at")
          
        elif role == 'Patient':
            return Notification.objects.filter(patient__patient_user=user).order_by("-created_at")
        return Notification.objects.none()

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)


class NotificationRetrieveUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None) and user.profile.role
        if role == 'Doctor':
            return Notification.objects.filter(doctor=user)
        elif role == 'Patient':
            return Notification.objects.filter(patient__patient_user=user)
        return Notification.objects.none()


class RequestOTPView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        phone = request.data.get("phone")
        if not phone:
            return Response({"error": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find user profile by phone
        profile = UserProfile.objects.filter(phone=phone).first()
        if not profile:
            return Response({"error": "No user found with this phone number"}, status=status.HTTP_404_NOT_FOUND)

        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        profile.otp = otp
        profile.otp_created_at = timezone.now()
        profile.save()

        # Mock sending SMS
        print(f"[SMS MOCK] Sending OTP {otp} to phone number {phone}")

        return Response({"message": "OTP sent successfully to your mobile number", "mock_otp": otp}, status=status.HTTP_200_OK)


class VerifyOTPAndResetPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        phone = request.data.get("phone")
        otp = request.data.get("otp")
        new_password = request.data.get("new_password")

        if not all([phone, otp, new_password]):
            return Response({"error": "Phone, OTP, and new password are required"}, status=status.HTTP_400_BAD_REQUEST)

        profile = UserProfile.objects.filter(phone=phone).first()
        if not profile:
            return Response({"error": "No user found with this phone number"}, status=status.HTTP_404_NOT_FOUND)

        if profile.otp != otp:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiration (e.g., 10 minutes)
        if not profile.otp_created_at or timezone.now() > profile.otp_created_at + timedelta(minutes=10):
            return Response({"error": "OTP has expired"}, status=status.HTTP_400_BAD_REQUEST)

        # Reset password
        user = profile.user
        user.set_password(new_password)
        user.save()

        # Clear OTP
        profile.otp = None
        profile.otp_created_at = None
        profile.save()

        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)