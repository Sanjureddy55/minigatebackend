from django.urls import path

from .views import FundDashboardView

urlpatterns = [
    path("", FundDashboardView.as_view(), name="fund-dashboard"),
]
