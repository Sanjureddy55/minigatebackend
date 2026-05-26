from django.urls import path

from .views import SecurityGuardDashboardView

urlpatterns = [
    path("", SecurityGuardDashboardView.as_view()),
]
