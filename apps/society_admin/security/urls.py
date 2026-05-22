from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GateViewSet, SecurityAlertViewSet, SecurityDashboardView

router = DefaultRouter()
router.register(r"gates",  GateViewSet,          basename="gate")
router.register(r"alerts", SecurityAlertViewSet,  basename="security-alert")

urlpatterns = [
    path("dashboard/", SecurityDashboardView.as_view(), name="security-dashboard"),
    path("", include(router.urls)),
]
