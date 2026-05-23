"""
Fund Dashboard URL Configuration
===================================
Base prefix: /api/accountant/fund-dashboard/

  GET  /   KPI cards + latest expenses + monthly trend  (?months=12)
"""

from django.urls import path
from .views import FundDashboardView

urlpatterns = [
    path("", FundDashboardView.as_view(), name="accountant-fund-dashboard"),
]
