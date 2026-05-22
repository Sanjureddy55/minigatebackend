"""
Society Admin — Complaints
Mount: /api/society-admin/complaints/

┌──────────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                         DESCRIPTION                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ GET          /                            Paginated list (resident complaints)    │
│ GET          /<id>/                       Detail                                  │
│ PATCH        /<id>/                       Update status / notes                   │
│ GET          /stats/?society=<id>         KPIs: open/in_progress/resolved_30d    │
│ POST         /<id>/assign/               Assign to staff member                  │
│ POST         /<id>/in-progress/          Move to In Progress                     │
│ POST         /<id>/resolve/              Resolve with resolution_notes           │
│ POST         /<id>/close/               Close complaint                          │
└──────────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SocietyComplaintViewSet

router = DefaultRouter()
router.register("", SocietyComplaintViewSet, basename="society-complaint")

urlpatterns = [path("", include(router.urls))]
