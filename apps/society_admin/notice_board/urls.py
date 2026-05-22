from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import NoticeDashboardView, NoticeViewSet

router = DefaultRouter()
router.register("", NoticeViewSet, basename="notice")

urlpatterns = [
    path("dashboard/", NoticeDashboardView.as_view(), name="notice-dashboard"),
] + router.urls
