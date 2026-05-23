from django.urls import path
from .views import FinancialReportsView

urlpatterns = [
    path("", FinancialReportsView.as_view(), name="accountant-financial-reports"),
]
