# pyrefly: ignore [missing-import]
from django.contrib import admin
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

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone", "doctor", "patient_user")
    search_fields = ("full_name", "email")
    list_filter = ("doctor",)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("medicine_name", "patient", "dosage", "frequency", "remaining_pills", "total_pills")
    search_fields = ("medicine_name", "patient__full_name")
    list_filter = ("frequency", "user")


@admin.register(MedicineSchedule)
class MedicineScheduleAdmin(admin.ModelAdmin):
    list_display = ("medicine", "scheduled_time", "status", "taken_at")
    list_filter = ("status", "scheduled_time")
    search_fields = ("medicine__medicine_name", "medicine__patient__full_name")


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ("schedule", "reminder_time", "status")
    list_filter = ("status", "reminder_time")


@admin.register(AdherenceLog)
class AdherenceLogAdmin(admin.ModelAdmin):
    list_display = ("medicine", "user", "status", "logged_at")
    list_filter = ("status", "logged_at")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("schedule", "notification_type", "recipient", "sent_at", "status")
    list_filter = ("notification_type", "status", "sent_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "message", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("patient__full_name", "message")