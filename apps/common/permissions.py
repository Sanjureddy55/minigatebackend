"""
apps/common/permissions.py
Role-based permission classes for MiniGate.

Usage in any view:
    from apps.common.permissions import IsSuperAdmin, IsSocietyAdmin, IsResident

    class MyView(APIView):
        permission_classes = [IsSuperAdmin]   # or IsSocietyAdmin, IsResident, IsSocietyAdminOrSuperAdmin
"""

from rest_framework.permissions import BasePermission, IsAuthenticated  # noqa: F401


def _get_role_slug(request) -> str:
    """Return the role slug for the authenticated user, or '' if none."""
    user = request.user
    if not user or not user.is_authenticated:
        return ""
    try:
        return user.profile.role.slug or ""
    except Exception:
        return ""


class IsSuperAdmin(BasePermission):
    """Allows access only to Super Admin users (role slug: super-admin or is_superuser)."""

    message = "Access denied. Super Admin role required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return _get_role_slug(request) == "super-admin"


class IsSocietyAdmin(BasePermission):
    """Allows access only to Society Admin users (role slug: society-admin)."""

    message = "Access denied. Society Admin role required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return _get_role_slug(request) in ("society-admin", "super-admin")


class IsResident(BasePermission):
    """
    Allows access only to Resident users.
    Super Admin may also access for support/debugging purposes.
    Society Admin uses /api/society-admin/ endpoints — not these personal resident views.
    """

    message = "Access denied. Resident account required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        slug = _get_role_slug(request)
        return slug == "resident" or request.user.is_superuser


class IsSocietyAdminOrSuperAdmin(BasePermission):
    """Society Admin or Super Admin."""

    message = "Access denied. Society Admin or Super Admin role required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return _get_role_slug(request) in ("society-admin", "super-admin") or request.user.is_superuser


class IsSecurityGuard(BasePermission):
    """Security Guard role."""

    message = "Access denied. Security Guard role required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return _get_role_slug(request) in ("security-guard", "society-admin", "super-admin")


class IsAccountant(BasePermission):
    """Accountant role."""

    message = "Access denied. Accountant role required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return _get_role_slug(request) in ("accountant", "society-admin", "super-admin")
