"""
URL configuration for apps.platform_admin.create_society.

Mount point (config/urls.py):
    path("api/platform-admin/create-society/", include("apps.platform_admin.create_society.urls"))

All endpoints are written explicitly here instead of relying solely on the DRF
router auto-include — this gives every team member a single file to read and
reason about without tracing through framework internals.

┌─────────────────────────────────────────────────────────────────────────┐
│  METHOD(S)      PATH                           DESCRIPTION              │
├─────────────────────────────────────────────────────────────────────────┤
│  GET            societies/                     List societies            │
│  POST           societies/                     Create a society          │
│  GET            societies/<id>/                Retrieve one society      │
│  PUT            societies/<id>/                Full update               │
│  PATCH          societies/<id>/                Partial update            │
│  DELETE         societies/<id>/                Delete a society          │
│  PATCH          societies/<id>/toggle-status/  Flip Active ↔ Inactive   │
└─────────────────────────────────────────────────────────────────────────┘

Absolute examples:
    GET  /api/platform-admin/create-society/societies/
    POST /api/platform-admin/create-society/societies/
    GET  /api/platform-admin/create-society/societies/7/
    PATCH /api/platform-admin/create-society/societies/7/toggle-status/
"""

from django.urls import path

from .views import SocietyViewSet

# ── ViewSet → view bindings ───────────────────────────────────────────────────
# Map HTTP methods to ViewSet actions explicitly so every URL is readable at a
# glance without a router.

society_list = SocietyViewSet.as_view(
    {
        "get": "list",    # GET  → list all societies
        "post": "create", # POST → create a new society
    }
)

society_detail = SocietyViewSet.as_view(
    {
        "get": "retrieve",          # GET    → fetch one
        "put": "update",            # PUT    → full replace
        "patch": "partial_update",  # PATCH  → partial update
        "delete": "destroy",        # DELETE → remove
    }
)

society_toggle_status = SocietyViewSet.as_view(
    {
        "patch": "toggle_status",   # PATCH → flip Active ↔ Inactive
    }
)

# ── URL patterns ──────────────────────────────────────────────────────────────

app_name = "create_society"

urlpatterns = [
    # Collection endpoint — list + create
    path(
        "societies/",
        society_list,
        name="society-list",
    ),

    # Item endpoint — retrieve, full-update, partial-update, delete
    path(
        "societies/<int:pk>/",
        society_detail,
        name="society-detail",
    ),

    # Dynamic status toggle — no body required, flips current value
    path(
        "societies/<int:pk>/toggle-status/",
        society_toggle_status,
        name="society-toggle-status",
    ),
]
