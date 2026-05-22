from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import NotificationStatsView, NotificationViewSet

router = DefaultRouter()
router.register("", NotificationViewSet, basename="notification")

urlpatterns = [
    path("stats/", NotificationStatsView.as_view(), name="notification-stats"),
] + router.urls
