from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import VisitorDashboardView, VisitorViewSet

router = DefaultRouter()
router.register("", VisitorViewSet, basename="visitor")

urlpatterns = [
    path("dashboard/", VisitorDashboardView.as_view(), name="visitor-dashboard"),
] + router.urls
