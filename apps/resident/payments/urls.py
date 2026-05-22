"""
Resident — Payments
Mount: /api/resident/payments/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                             DESCRIPTION                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET/POST     payments/dues/                   List / create maintenance dues │
│ GET/PATCH/   payments/dues/{id}/              Retrieve / update / delete     │
│ DELETE                                                                       │
│ POST         payments/dues/{id}/mark-paid/    Mark a due as paid             │
│ GET/POST     payments/history/                Payment history / record        │
│ GET/PATCH/   payments/history/{id}/           Retrieve / update / delete     │
│ DELETE                                                                       │
│ GET          payments/summary/                KPI summary for a flat         │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MaintenanceDueViewSet, ResidentPaymentSummaryView, ResidentPaymentViewSet

router = DefaultRouter()
router.register("dues",    MaintenanceDueViewSet,   basename="resident-maintenance-due")
router.register("history", ResidentPaymentViewSet,  basename="resident-payment")

urlpatterns = [
    path("summary/", ResidentPaymentSummaryView.as_view(), name="resident-payment-summary"),
] + router.urls
