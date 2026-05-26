from django.urls import path
from .views import ServiceHistoryView

urlpatterns = [
    path("", ServiceHistoryView.as_view()),
]
