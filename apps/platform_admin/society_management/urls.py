from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SocietyManagementViewSet

router = DefaultRouter()
router.register(r"", SocietyManagementViewSet, basename="society-management")

urlpatterns = [
    path("", include(router.urls)),
]
