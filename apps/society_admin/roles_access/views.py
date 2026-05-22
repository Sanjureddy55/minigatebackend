import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.roles_permissions.models import Role, UserProfile
from apps.roles_permissions.serializers import UserProfileSerializer
from apps.common.utils import get_society_id

from .serializers import (
    ALLOWED_ROLE_TYPES,
    PROTECTED_SLUGS,
    SocietyAssignUserSerializer,
    SocietyRoleDashboardSerializer,
    SocietyRoleSerializer,
)

logger = logging.getLogger(__name__)


def _is_protected(role: Role) -> bool:
    return role.slug in PROTECTED_SLUGS or role.system_role


class SocietyRoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Society Admin-scoped Role management.

    Rules enforced transparently:
    - List / Retrieve : excludes Super Admin and Society Admin roles.
    - Create          : blocks protected names; role_type restricted to
                        operational / resident / external.
    - Update (PATCH)  : blocks edits to protected / system roles.
    - Delete          : blocks protected / system roles and roles with active users.
    - assign-user     : creates User + UserProfile under the chosen role,
                        scoped to the requesting society.

    Endpoints
    ---------
    GET    /api/society-admin/roles-access/
    POST   /api/society-admin/roles-access/
    GET    /api/society-admin/roles-access/{id}/
    PUT    /api/society-admin/roles-access/{id}/
    PATCH  /api/society-admin/roles-access/{id}/
    DELETE /api/society-admin/roles-access/{id}/
    POST   /api/society-admin/roles-access/{id}/assign-user/
    POST   /api/society-admin/roles-access/{id}/toggle-active/
    GET    /api/society-admin/roles-access/dashboard/
    GET    /api/society-admin/roles-access/available-modules/
    """

    serializer_class = SocietyRoleSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role_type", "is_active"]
    search_fields    = ["name", "description"]
    ordering_fields  = ["name", "role_type", "created_at"]
    ordering         = ["name"]

    def get_queryset(self):
        return (
            Role.objects
            .exclude(slug__in=PROTECTED_SLUGS)
            .prefetch_related("module_permissions", "users")
            .order_by("name")
        )

    # ── List ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        logger.info("SOCIETY_ROLE_LIST | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SocietyRoleSerializer(page, many=True).data)
        return Response({
            "count":   qs.count(),
            "results": SocietyRoleSerializer(qs, many=True).data,
        })

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        logger.info(
            "SOCIETY_ROLE_CREATE_ATTEMPT | user=%s name='%s'",
            request.user, request.data.get("name"),
        )
        serializer = SocietyRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            {"success": True, "message": "Role created.", "data": SocietyRoleSerializer(role).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info("SOCIETY_ROLE_RETRIEVE | id=%s name='%s'", instance.pk, instance.name)
        return Response({"success": True, "data": SocietyRoleSerializer(instance).data})

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()

        if _is_protected(instance):
            return Response(
                {"success": False, "message": "This role cannot be modified by Society Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info("SOCIETY_ROLE_UPDATE_ATTEMPT | user=%s id=%s partial=%s", request.user, instance.pk, partial)
        serializer = SocietyRoleSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        label = "partially updated" if partial else "updated"
        return Response({"success": True, "message": f"Role {label}.", "data": SocietyRoleSerializer(role).data})

    # ── Delete ────────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if _is_protected(instance):
            return Response(
                {"success": False, "message": "This role cannot be deleted by Society Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        active_users = instance.users.filter(status=UserProfile.Status.ACTIVE).count()
        if active_users > 0:
            return Response(
                {
                    "success": False,
                    "message": f"Cannot delete '{instance.name}': {active_users} active user(s) assigned to it. "
                               "Deactivate or reassign them first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = instance.name
        logger.warning(
            "SOCIETY_ROLE_DELETE | user=%s id=%s name='%s'",
            request.user, instance.pk, name,
        )
        instance.delete()
        return Response({"success": True, "message": f"Role '{name}' deleted."})

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="assign-user")
    def assign_user(self, request, pk=None):
        """
        POST /api/society-admin/roles-access/{id}/assign-user/

        Body: full_name, email, mobile, status, description, society (opt), flat_number (opt)
        Creates Django User + UserProfile under this role.
        Sends welcome email with credentials (password = 123456).
        """
        role = self.get_object()

        if _is_protected(role):
            return Response(
                {"success": False, "message": "Cannot assign users to this role via Society Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info(
            "SOCIETY_ASSIGN_USER_ATTEMPT | role=%s email='%s' by=%s",
            role.name, request.data.get("email", "—"), request.user,
        )
        data = {**request.data, "role": role.pk}
        serializer = SocietyAssignUserSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            {
                "success": True,
                "message": "User created and welcome email sent.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Toggle is_active on a non-protected role."""
        role = self.get_object()
        if _is_protected(role):
            return Response(
                {"success": False, "message": "This role cannot be toggled by Society Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )
        role.is_active = not role.is_active
        role.save(update_fields=["is_active", "updated_at"])
        state = "activated" if role.is_active else "deactivated"
        logger.info("SOCIETY_ROLE_TOGGLE | id=%s name='%s' -> %s", role.pk, role.name, state)
        return Response({
            "success": True,
            "message": f"Role '{role.name}' {state}.",
            "data":    SocietyRoleSerializer(role).data,
        })

    @action(detail=False, methods=["get"], url_path="available-modules")
    def available_modules(self, request):
        """GET /api/society-admin/roles-access/available-modules/ — all 17 modules."""
        from apps.roles_permissions.models import Module
        return Response({
            "modules":    [{"value": v, "label": str(l)} for v, l in Module.choices],
            "role_types": [
                {"value": v, "label": str(l)}
                for v, l in [
                    ("operational",  "Operational"),
                    ("resident",     "Resident"),
                    ("external",     "External"),
                ]
            ],
        })


class SocietyRoleDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/roles-access/dashboard/?society=<id>

    Returns a summary of all non-protected roles and their user counts,
    scoped optionally to a society.
    """

    def get(self, request):
        society_id = get_society_id(request)

        role_qs = (
            Role.objects
            .exclude(slug__in=PROTECTED_SLUGS)
            .prefetch_related("users")
        )

        user_qs = UserProfile.objects.exclude(role__slug__in=PROTECTED_SLUGS)
        if society_id:
            user_qs = user_qs.filter(society_id=society_id)

        by_role_type = list(
            role_qs.values("role_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        by_role = list(
            user_qs
            .values("role__name", "role__id")
            .annotate(user_count=Count("id"))
            .order_by("-user_count")
        )

        data = {
            "total_roles":  role_qs.count(),
            "active_roles": role_qs.filter(is_active=True).count(),
            "total_users":  user_qs.count(),
            "active_users": user_qs.filter(status=UserProfile.Status.ACTIVE).count(),
            "by_role_type": by_role_type,
            "by_role":      by_role,
        }
        return Response(SocietyRoleDashboardSerializer(data).data)


class SocietyUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Manage users scoped to non-protected roles.

    GET    /api/society-admin/roles-access/users/
    GET    /api/society-admin/roles-access/users/{id}/
    PATCH  /api/society-admin/roles-access/users/{id}/
    DELETE /api/society-admin/roles-access/users/{id}/  → soft-deactivate
    """

    serializer_class = UserProfileSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "role", "society"]
    search_fields    = ["full_name", "mobile", "user__email"]
    ordering_fields  = ["full_name", "created_at", "status"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return (
            UserProfile.objects
            .exclude(role__slug__in=PROTECTED_SLUGS)
            .select_related("user", "role", "society")
            .prefetch_related("role__module_permissions")
        )

    def list(self, request, *args, **kwargs):
        logger.info("SOCIETY_USER_LIST | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(UserProfileSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": UserProfileSerializer(qs, many=True).data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({"success": True, "data": UserProfileSerializer(instance).data})

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = UserProfileSerializer(instance, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        ser.save()
        logger.info("SOCIETY_USER_UPDATE | id=%s by=%s", instance.pk, request.user)
        return Response({"success": True, "data": ser.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = UserProfile.Status.INACTIVE
        instance.save(update_fields=["status", "updated_at"])
        logger.warning("SOCIETY_USER_DEACTIVATE | id=%s by=%s", instance.pk, request.user)
        return Response({"success": True, "message": "User deactivated."})