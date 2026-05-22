"""
Resident — Dashboard
Mount: /api/resident/dashboard/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH          DESCRIPTION                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          dashboard/    KPI cards: bills, payments, complaints, passes    │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path

from .views import ResidentDashboardView

urlpatterns = [
    path("", ResidentDashboardView.as_view(), name="resident-dashboard"),
]
