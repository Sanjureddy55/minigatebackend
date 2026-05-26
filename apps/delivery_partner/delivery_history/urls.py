from django.urls import path
from .views import DeliveryHistoryView

urlpatterns = [
    path("", DeliveryHistoryView.as_view()),
]
