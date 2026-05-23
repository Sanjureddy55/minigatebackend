"""
Resident — Maintenance Transparency
Mount: /api/resident/maintenance-transparency/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                                   DESCRIPTION              │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          /                                      KPIs + published expenses │
│ GET          /expenses/{id}/proof/?society=<id>    Download proof document   │
│                                                    (published only)          │
└──────────────────────────────────────────────────────────────────────────────┘

Query params for /:
  society=<id>       required
  flat=<uuid>        optional (for "My Maintenance Paid" KPI)
"""
from django.urls import path

from .views import ExpenseProofDownloadView, MaintenanceTransparencyView

urlpatterns = [
    path("",                           MaintenanceTransparencyView.as_view(),  name="resident-maintenance-transparency"),
    path("expenses/<int:pk>/proof/",   ExpenseProofDownloadView.as_view(),     name="resident-expense-proof"),
]
