"""
Platform Admin — Dashboard
Mount: /api/platform-admin/dashboard/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)  PATH          DESCRIPTION                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET        stats/        Live platform-wide KPIs                              │
│ GET        societies/    Paginated, filterable society list with KPI cols     │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path

from .views import DashboardSocietyListView, DashboardStatsView

urlpatterns = [
    path("stats/",      DashboardStatsView.as_view(),               name="platform-dashboard-stats"),
    path("societies/",  DashboardSocietyListView.as_view({"get": "list"}), name="platform-dashboard-societies"),
]
