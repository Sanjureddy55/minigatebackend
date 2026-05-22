"""
Society Admin — Resident Management
Mount: /api/society-admin/residents/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                                     DESCRIPTION            │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          residents/                               List all residents     │
│ GET          residents/{id}/                          Resident detail        │
│ POST         residents/{id}/approve/                  Approve → ACTIVE       │
│ POST         residents/{id}/reject/                   Reject → INACTIVE      │
│ POST         residents/{id}/deactivate/               Deactivate resident    │
│ POST         residents/{id}/reactivate/               Reactivate resident    │
│ GET          residents/pending/                       Pending approvals only │
│ GET          residents/dashboard/                     KPI summary            │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from rest_framework.routers import DefaultRouter

from .views import SocietyResidentViewSet

router = DefaultRouter()
router.register("", SocietyResidentViewSet, basename="society-resident")

urlpatterns = router.urls
