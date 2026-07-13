# pyrefly: ignore [missing-import]
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile,
    Patient,
    Medicine,
    MedicineSchedule,
    ReminderLog,
    AdherenceLog,
    NotificationLog,
    Notification
)

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return "Doctor" if obj.is_staff else "Patient"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[('Doctor', 'Doctor'), ('Patient', 'Patient')], write_only=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ("username", "password", "email", "first_name", "last_name", "role", "phone")

    def validate_email(self, value):
        if value:
            existing_user = User.objects.filter(email__iexact=value).first()
            if existing_user:
                role_exists = getattr(existing_user, 'profile', None) and existing_user.profile.role
                if role_exists == 'Doctor':
                    raise serializers.ValidationError("This email is already registered as a doctor account.")
        return value

    def create(self, validated_data):
        role = validated_data.pop('role')
        phone = validated_data.pop('phone', None)
        email = validated_data.get('email')
        
        if email:
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                # Update registration details on the existing auto-created account
                existing_user.username = validated_data["username"]
                existing_user.set_password(validated_data["password"])
                existing_user.first_name = validated_data.get("first_name", existing_user.first_name)
                existing_user.last_name = validated_data.get("last_name", existing_user.last_name)
                existing_user.save()
                
                # Update role to Patient
                profile, created = UserProfile.objects.get_or_create(user=existing_user)
                profile.role = role
                if phone:
                    profile.phone = phone
                profile.save()
                return existing_user

        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        UserProfile.objects.create(user=user, role=role, phone=phone)
        return user


class PatientSerializer(serializers.ModelSerializer):
    patient_username = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = "__all__"
        read_only_fields = ("doctor", "patient_user")

    def get_patient_username(self, obj):
        if obj.patient_user:
            return obj.patient_user.username
        # Fallback if user is not set yet
        return obj.email.split('@')[0] + str(obj.id)

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            doctor = request.user
            email = attrs.get('email')
            queryset = Patient.objects.filter(doctor=doctor, email=email)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({"email": "You have already registered a patient with this email."})
            
            # Prevent registering a patient with an email of a registered doctor
            if User.objects.filter(email__iexact=email, profile__role='Doctor').exists():
                raise serializers.ValidationError({"email": "This email is registered to a doctor account."})
        return attrs


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = "__all__"
        read_only_fields = ("user",)

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            role = getattr(user, 'profile', None) and user.profile.role
            if role == 'Doctor':
                patient = attrs.get('patient')
                if patient and patient.doctor != user:
                    raise serializers.ValidationError({"patient": "You are not authorized to manage medications for this patient."})
        return attrs


class MedicineScheduleSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.medicine_name", read_only=True)
    dosage = serializers.CharField(source="medicine.dosage", read_only=True)

    class Meta:
        model = MedicineSchedule
        fields = "__all__"

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            role = getattr(user, 'profile', None) and user.profile.role
            if role == 'Patient':
                # Patients can only update status
                allowed_fields = {'status'}
                updated_fields = set(attrs.keys())
                if not updated_fields.issubset(allowed_fields):
                    raise serializers.ValidationError("Patients are only authorized to update the status field of a schedule.")
        return attrs


class ReminderLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderLog
        fields = "__all__"


class AdherenceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdherenceLog
        fields = "__all__"


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ("doctor",)

    def get_doctor_name(self, obj):
        doctor = obj.doctor
        if doctor.first_name:
            if doctor.last_name:
                return f"{doctor.first_name} {doctor.last_name}"
            return doctor.first_name
        return doctor.username

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            patient = attrs.get('patient')
            if patient and patient.doctor != user:
                raise serializers.ValidationError({"patient": "You are not authorized to send notifications to this patient."})
        return attrs