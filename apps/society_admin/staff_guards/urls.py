from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StaffMemberViewSet

router = DefaultRouter()
router.register(r"", StaffMemberViewSet, basename="staff-member")

urlpatterns = [path("", include(router.urls))]
