from django.urls import path
from .views import DeliveryDashboardView

urlpatterns = [
    path("", DeliveryDashboardView.as_view()),
]
