"""
Resident — SOS Emergency
Mount: /api/resident/sos/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                    DESCRIPTION                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST         sos/                    Trigger SOS alert                       │
│ GET          sos/                    List alerts (?flat=&society=&status=)   │
│ GET          sos/{id}/               Alert detail                            │
│ POST         sos/{id}/resolve/       Resolve alert (admin)                   │
│ GET          sos/active/             Active alerts for society admin          │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from rest_framework.routers import DefaultRouter

from .views import SOSAlertViewSet

router = DefaultRouter()
router.register("", SOSAlertViewSet, basename="resident-sos")

urlpatterns = router.urls
