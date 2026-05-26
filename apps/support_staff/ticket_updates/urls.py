from django.urls import path
from .views import TicketUpdateListCreateView

urlpatterns = [
    path("", TicketUpdateListCreateView.as_view()),
]
