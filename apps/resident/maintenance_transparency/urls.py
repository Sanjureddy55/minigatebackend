"""
Resident — Maintenance Transparency
Mount: /api/resident/maintenance-transparency/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                        DESCRIPTION                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          maintenance-transparency/   KPIs + published expense proofs     │
└──────────────────────────────────────────────────────────────────────────────┘

Query params:
  society=<id>       required
  flat=<uuid>        optional (for "My Maintenance Paid")
"""
from django.urls import path

from .views import MaintenanceTransparencyView

urlpatterns = [
    path("", MaintenanceTransparencyView.as_view(), name="resident-maintenance-transparency"),
]
