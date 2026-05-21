"""
URL configuration for apps.roles_permissions.

Mount point (config/urls.py):
    path("api/roles-permissions/", include("apps.roles_permissions.urls"))

┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD(S)   PATH                              DESCRIPTION                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET/POST    roles/                            List / create roles           │
│  GET/PUT/    roles/{id}/                       Retrieve / update / delete    │
│  DELETE                                                                     │
│  POST        roles/{id}/assign-user/           Create user under this role  │
│  GET/PATCH   users/                            List user profiles            │
│  GET/PATCH/  users/{id}/                       Retrieve / update / delete   │
│  DELETE                                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from django.urls import path

from .views import RoleViewSet, SuperAdminSetupView, UserProfileViewSet

# ── Role bindings ─────────────────────────────────────────────────────────────
role_list        = RoleViewSet.as_view({"get": "list",     "post": "create"})
role_detail      = RoleViewSet.as_view({"get": "retrieve", "put": "update",
                                        "patch": "partial_update", "delete": "destroy"})
role_assign_user = RoleViewSet.as_view({"post": "assign_user"})

# ── UserProfile bindings ──────────────────────────────────────────────────────
user_list   = UserProfileViewSet.as_view({"get": "list"})
user_detail = UserProfileViewSet.as_view({"get": "retrieve", "patch": "partial_update",
                                          "delete": "destroy"})

app_name = "roles_permissions"

urlpatterns = [
    path("setup-super-admin/",          SuperAdminSetupView.as_view(), name="setup-super-admin"),
    path("roles/",                      role_list,        name="role-list"),
    path("roles/<int:pk>/",             role_detail,      name="role-detail"),
    path("roles/<int:pk>/assign-user/", role_assign_user, name="role-assign-user"),
    path("users/",                      user_list,        name="user-list"),
    path("users/<int:pk>/",             user_detail,      name="user-detail"),
]
