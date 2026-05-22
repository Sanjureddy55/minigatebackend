"""
Society Admin — Roles & Access Management
Mount: /api/society-admin/roles-access/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                                      DESCRIPTION           │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          roles-access/                             List creatable roles   │
│ POST         roles-access/                             Create new role        │
│ GET          roles-access/{id}/                        Retrieve role detail   │
│ PUT/PATCH    roles-access/{id}/                        Update role/perms      │
│ DELETE       roles-access/{id}/                        Delete role            │
│ POST         roles-access/{id}/assign-user/            Create user under role │
│ POST         roles-access/{id}/toggle-active/          Enable/disable role    │
│ GET          roles-access/available-modules/           All modules + types    │
│ GET          roles-access/dashboard/                   Role/user KPIs         │
│ GET          roles-access/users/                       List scoped users      │
│ GET/PATCH/   roles-access/users/{id}/                  User detail/update     │
│ DELETE                                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SocietyRoleDashboardView, SocietyRoleViewSet, SocietyUserViewSet

router = DefaultRouter()
router.register("users", SocietyUserViewSet, basename="society-user")
router.register("",      SocietyRoleViewSet, basename="society-role")

urlpatterns = [
    path("dashboard/", SocietyRoleDashboardView.as_view(), name="society-role-dashboard"),
] + router.urls
