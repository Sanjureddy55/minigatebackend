from django.urls import path

from .views import SocietyDashboardView

urlpatterns = [
    path("", SocietyDashboardView.as_view(), name="society-dashboard"),
]
