import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.roles_permissions.models import UserProfile

from .serializers import (
    STAFF_ROLE_SLUGS,
    StaffAccountCreateSerializer,
    StaffAccountSerializer,
    StaffAccountUpdateSerializer,
)

logger = logging.getLogger(__name__)


class StaffAccountViewSet(viewsets.ViewSet):
    """
    Society Admin — manage staff login accounts in their society.

    Covers: Security Guards, Accountants, Maintenance Staff, Support Staff.
    Residents self-register; Society Admin and Super Admin are managed at platform level.

    GET    /api/society-admin/staff-accounts/              list all staff accounts
    POST   /api/society-admin/staff-accounts/              create a new staff account
    GET    /api/society-admin/staff-accounts/<id>/         retrieve
    PATCH  /api/society-admin/staff-accounts/<id>/         update name / mobile / description
    POST   /api/society-admin/staff-accounts/<id>/deactivate/
    POST   /api/society-admin/staff-accounts/<id>/reactivate/
    GET    /api/society-admin/staff-accounts/roles/        list allowed staff role options
    """
    permission_classes = [IsSocietyAdmin]

    def _society(self, request):
        try:
            return request.user.profile.society
        except Exception:
            return None

    def _base_qs(self, society):
        return (
            UserProfile.objects
            .filter(society=society, role__slug__in=STAFF_ROLE_SLUGS.keys())
            .select_related("user", "role", "society")
            .order_by("role__slug", "full_name")
        )

    # ── List ──────────────────────────────────────────────────────────────────

    def list(self, request):
        society = self._society(request)
        if not society:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = self._base_qs(society)

        # Optional filters
        role_slug    = request.query_params.get("role")
        account_status = request.query_params.get("status")
        search       = request.query_params.get("search")

        if role_slug:
            qs = qs.filter(role__slug=role_slug)
        if account_status:
            qs = qs.filter(status=account_status)
        if search:
            qs = qs.filter(full_name__icontains=search) | qs.filter(mobile__icontains=search)

        return Response({
            "success": True,
            "count":   qs.count(),
            "results": StaffAccountSerializer(qs, many=True).data,
        })

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, request):
        society = self._society(request)
        if not society:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = StaffAccountCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile = ser.save(society=society)

        logger.info(
            "STAFF_ACCOUNT_CREATED | profile_id=%s role=%s society=%s by=%s",
            profile.pk, request.data.get("role_slug"), society.pk, request.user.pk,
        )
        response_data = StaffAccountSerializer(profile).data
        response_data["temp_password"] = getattr(profile, "_dispatched_password", "123456")

        return Response(
            {"success": True, "message": "Staff account created. Staff can log in with their mobile number and OTP 123456.", "data": response_data},
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, pk=None):
        society = self._society(request)
        try:
            profile = self._base_qs(society).get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Staff account not found."}, status=404)
        return Response({"success": True, "data": StaffAccountSerializer(profile).data})

    # ── Partial Update ────────────────────────────────────────────────────────

    def partial_update(self, request, pk=None):
        society = self._society(request)
        try:
            profile = self._base_qs(society).get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Staff account not found."}, status=404)

        ser = StaffAccountUpdateSerializer(profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        logger.info("STAFF_ACCOUNT_UPDATE | profile_id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "data": StaffAccountSerializer(profile).data})

    # ── Deactivate ────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        society = self._society(request)
        try:
            profile = self._base_qs(society).get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Staff account not found."}, status=404)

        if profile.status == UserProfile.Status.INACTIVE:
            return Response({"success": False, "message": "Account is already inactive."}, status=400)

        profile.status = UserProfile.Status.INACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.warning("STAFF_ACCOUNT_DEACTIVATE | profile_id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": f"'{profile.full_name}' deactivated."})

    # ── Reactivate ────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        society = self._society(request)
        try:
            profile = self._base_qs(society).get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Staff account not found."}, status=404)

        if profile.status == UserProfile.Status.ACTIVE:
            return Response({"success": False, "message": "Account is already active."}, status=400)

        profile.status = UserProfile.Status.ACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.info("STAFF_ACCOUNT_REACTIVATE | profile_id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": f"'{profile.full_name}' reactivated."})

    # ── Role options ──────────────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="roles")
    def roles(self, request):
        """GET /api/society-admin/staff-accounts/roles/ — role choices for the create form."""
        from apps.roles_permissions.models import Role
        options = []
        for slug, label in STAFF_ROLE_SLUGS.items():
            role = Role.objects.filter(slug=slug, is_active=True).first()
            options.append({
                "slug":       slug,
                "label":      label,
                "configured": role is not None,
                "role_id":    role.pk if role else None,
            })
        return Response({"success": True, "roles": options})

    # ── KPI summary ───────────────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        """GET /api/society-admin/staff-accounts/kpi/ — staff account counts by role."""
        society = self._society(request)
        if not society:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = self._base_qs(society)
        data = {
            "total":  qs.count(),
            "active": qs.filter(status=UserProfile.Status.ACTIVE).count(),
            "by_role": {
                slug: qs.filter(role__slug=slug).count()
                for slug in STAFF_ROLE_SLUGS
            },
        }
        return Response({"success": True, "data": data})
