from django.urls import path
from .views import MaintenanceScheduleView

urlpatterns = [
    path("", MaintenanceScheduleView.as_view()),
]
