from django.urls import path
from .views import MaintenanceDashboardView

urlpatterns = [
    path("", MaintenanceDashboardView.as_view()),
]
