from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MonthlyStatementViewSet

router = DefaultRouter()
router.register(r"", MonthlyStatementViewSet, basename="monthly-statement")

urlpatterns = [
    path("", include(router.urls)),
]
