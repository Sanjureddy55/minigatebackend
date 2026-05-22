from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SubscriptionPlanViewSet

router = DefaultRouter()
router.register(r"", SubscriptionPlanViewSet, basename="subscription-plan")

urlpatterns = [
    path("", include(router.urls)),
]
