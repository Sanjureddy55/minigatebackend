"""
Resident — Complaints
Mount: /api/resident/complaints/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                             DESCRIPTION                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET/POST     complaints/                      List / file complaint          │
│ GET/PUT/     complaints/{id}/                 Retrieve / update / delete     │
│ PATCH/DELETE                                                                 │
│ POST         complaints/{id}/resolve/         Mark resolved                  │
│ POST         complaints/{id}/close/           Close complaint                │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from rest_framework.routers import DefaultRouter

from .views import ComplaintViewSet

router = DefaultRouter()
router.register("", ComplaintViewSet, basename="resident-complaint")

urlpatterns = router.urls
