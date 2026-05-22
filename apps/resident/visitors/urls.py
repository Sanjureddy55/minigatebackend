"""
Resident — Visitors
Mount: /api/resident/visitors/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                               DESCRIPTION                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET/POST     visitors/passes/                   List / create guest passes   │
│ GET/PATCH/   visitors/passes/{id}/              Retrieve / update / delete   │
│ DELETE                                                                       │
│ POST         visitors/passes/{id}/cancel/       Cancel an active pass        │
│ GET          visitors/approvals/                Visitor approval list        │
│ GET          visitors/deliveries/               Delivery approval list       │
│ GET          visitors/history/                  Entry/exit history           │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import GuestPassViewSet, ResidentDeliveryApprovalView, ResidentEntryExitHistoryView, ResidentVisitorApprovalView

router = DefaultRouter()
router.register("passes", GuestPassViewSet, basename="resident-guest-pass")

urlpatterns = [
    path("approvals/",  ResidentVisitorApprovalView.as_view(),  name="resident-visitor-approvals"),
    path("deliveries/", ResidentDeliveryApprovalView.as_view(), name="resident-delivery-approvals"),
    path("history/",    ResidentEntryExitHistoryView.as_view(), name="resident-entry-exit-history"),
] + router.urls
