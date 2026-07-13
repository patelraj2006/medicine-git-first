# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    PatientListCreateView,
    PatientRetrieveUpdateDestroyView,
    MedicineListCreateView,
    MedicineRetrieveUpdateDestroyView,
    ScheduleListView,
    ScheduleRetrieveUpdateDestroyAPIView,
    AdherenceListView,
    ExtractMedicationView,
    DashboardView,
    NotificationListCreateView,
    NotificationRetrieveUpdateView,
    RequestOTPView,
    VerifyOTPAndResetPasswordView
)

urlpatterns = [
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/profile/", ProfileView.as_view(), name="profile"),
    path("auth/request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("auth/reset-password/", VerifyOTPAndResetPasswordView.as_view(), name="reset-password"),

    # Patient profiles
    path("patients/", PatientListCreateView.as_view(), name="patient-list"),
    path("patients/<int:pk>/", PatientRetrieveUpdateDestroyView.as_view(), name="patient-detail"),

    # Medicines CRUD
    path("medicines/", MedicineListCreateView.as_view(), name="medicine-list"),
    path("medicines/<int:pk>/", MedicineRetrieveUpdateDestroyView.as_view(), name="medicine-detail"),

    # Schedules and adherence
    path("schedules/", ScheduleListView.as_view(), name="schedule-list"),
    path("schedules/<int:pk>/", ScheduleRetrieveUpdateDestroyAPIView.as_view(), name="schedule-detail"),
    path("adherence/", AdherenceListView.as_view(), name="adherence-list"),

    # Notifications
    path("notifications/", NotificationListCreateView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/", NotificationRetrieveUpdateView.as_view(), name="notification-detail"),

    # Utility endpoints
    path("extract-medication/", ExtractMedicationView.as_view(), name="extract-medication"),
    path("dashboard/", DashboardView.as_view(), name="dashboard-analytics"),
]