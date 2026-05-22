"""
Society Admin — Maintenance Expenses
Mount: /api/society-admin/maintenance-expenses/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                                   DESCRIPTION              │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET/POST     maintenance-expenses/                  List / record expense    │
│ GET/PUT/     maintenance-expenses/{id}/             Retrieve / update / del  │
│ PATCH/DELETE                                                                 │
│ POST         maintenance-expenses/{id}/publish/     Publish to residents     │
│ POST         maintenance-expenses/{id}/unpublish/   Unpublish from residents │
│ GET          maintenance-expenses/summary/          Category breakdown KPIs  │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from rest_framework.routers import DefaultRouter

from .views import MaintenanceExpenseViewSet

router = DefaultRouter()
router.register("", MaintenanceExpenseViewSet, basename="society-maintenance-expense")

urlpatterns = router.urls
