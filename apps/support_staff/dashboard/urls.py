from django.urls import path
from .views import SupportDashboardView

urlpatterns = [
    path("", SupportDashboardView.as_view()),
]
