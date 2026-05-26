from django.urls import path
from .views import EscalationListCreateView

urlpatterns = [
    path("", EscalationListCreateView.as_view()),
]
