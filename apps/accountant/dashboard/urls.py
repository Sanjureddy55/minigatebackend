from django.urls import path
from .views import AccountantBillingDashboardView

urlpatterns = [
    path("", AccountantBillingDashboardView.as_view(), name="accountant-billing-dashboard"),
]
