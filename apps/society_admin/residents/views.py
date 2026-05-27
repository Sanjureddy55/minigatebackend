import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile

from .serializers import (
    ResidentApproveSerializer,
    ResidentCreateByAdminSerializer,
    ResidentListSerializer,
    ResidentRejectSerializer,
)

logger = logging.getLogger(__name__)


class SocietyResidentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Society Admin — manage and approve residents.

    GET    /api/society-admin/residents/
    GET    /api/society-admin/residents/{id}/
    POST   /api/society-admin/residents/add/          ← NEW: direct create
    POST   /api/society-admin/residents/{id}/approve/
    POST   /api/society-admin/residents/{id}/reject/
    POST   /api/society-admin/residents/{id}/deactivate/
    POST   /api/society-admin/residents/{id}/reactivate/
    GET    /api/society-admin/residents/pending/
    GET    /api/society-admin/residents/dashboard/
    """

    serializer_class = ResidentListSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "role"]          # 'society' removed — auto-scoped
    search_fields    = ["full_name", "mobile", "flat_number", "user__email"]
    ordering_fields  = ["full_name", "created_at", "status"]
    ordering         = ["-created_at"]

    def _get_admin_society_id(self):
        """
        Returns the society ID of the currently logged-in society admin.
        Raises PermissionDenied if their account is not linked to any society.
        """
        try:
            society_id = self.request.user.profile.society_id
            if not society_id:
                raise PermissionError
            return society_id
        except Exception:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Your account is not linked to any society.")

    def get_queryset(self):
        """Always scope to the logged-in admin's society — no ?society= param accepted."""
        society_id = self._get_admin_society_id()
        return (
            UserProfile.objects
            .select_related("user", "role", "society")
            .prefetch_related("resident_flats__flat__building")
            .exclude(role__slug="super-admin")
            .filter(society_id=society_id)          # ← hard-scoped to admin's society
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        logger.info("RESIDENT_LIST | user=%s society=%s", request.user, self._get_admin_society_id())
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ResidentListSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ResidentListSerializer(qs, many=True).data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()    # get_queryset already scopes to admin's society
        return Response({"success": True, "data": ResidentListSerializer(instance).data})

    # ── Direct Create (Society Admin adds resident without self-registration) ──

    @action(detail=False, methods=["post"], url_path="add")
    def add(self, request):
        """
        POST /api/society-admin/residents/add/

        Society admin creates a resident directly — no onboarding / OTP flow needed.
        The resident is created ACTIVE immediately and can log in with OTP 123456.

        Body:
          {
            "full_name":      "Rahul Mehta",
            "email":          "rahul@example.com",   (optional)
            "mobile":         "9199999999",
            "type":           "owner",               (owner | tenant)
            "building":       1,                     (building ID)
            "flat_number":    "A-201",
            "family_members": 2,                     (optional, default 0)
            "vehicles":       1                      (optional, default 0)
          }
        """
        # Society comes from the logged-in admin's profile — not from request body
        society_id = self._get_admin_society_id()
        try:
            society = Society.objects.get(pk=society_id)
        except Society.DoesNotExist:
            return Response(
                {"success": False, "message": "Society not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Merge society into data so validate() can filter buildings by society
        data = request.data.copy()
        data["_society"] = society   # consumed by validate(), not stored in DB

        ser = ResidentCreateByAdminSerializer(
            data=data,
            context={"request": request, "society": society},
        )
        ser.is_valid(raise_exception=True)

        # Inject society for create() (not part of the public request body)
        validated = dict(ser.validated_data)
        validated.pop("_society", None)
        validated["society"] = society

        profile, family_count, vehicle_count = ser.create(validated)

        logger.info(
            "RESIDENT_ADD_BY_ADMIN | profile=%s society=%s by=%s",
            profile.pk, society.pk, request.user.pk,
        )
        return Response(
            {
                "success": True,
                "message": f"Resident '{profile.full_name}' created successfully.",
                "data": {
                    **ResidentListSerializer(profile).data,
                    "family_members_noted": family_count,
                    "vehicles_noted":       vehicle_count,
                    "default_otp":          "123456",
                    "note": (
                        "Resident can log in immediately using their mobile number "
                        "and OTP 123456. Default password is their mobile number."
                    ),
                },
            },
            status=status.HTTP_201_CREATED,
        )

    # ── Approval Actions ──────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """
        POST /api/society-admin/residents/{id}/approve/
        Body (optional): { "flat_number": "102", "role": <role_id> }

        Sets status=ACTIVE. Optionally assigns flat_number and role.
        """
        profile = self.get_object()
        if profile.status == UserProfile.Status.ACTIVE:
            return Response({"success": False, "message": "Resident is already active."}, status=400)

        ser = ResidentApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        profile.status = UserProfile.Status.ACTIVE
        update_fields  = ["status", "updated_at"]

        if ser.validated_data.get("flat_number"):
            profile.flat_number = ser.validated_data["flat_number"]
            update_fields.append("flat_number")

        if ser.validated_data.get("role"):
            profile.role = ser.validated_data["role"]
            update_fields.append("role")
        elif profile.role is None:
            from apps.roles_permissions.models import Role as _Role
            resident_role = _Role.objects.filter(slug="resident").first()
            if resident_role:
                profile.role = resident_role
                update_fields.append("role")

        profile.save(update_fields=update_fields)
        logger.info("RESIDENT_APPROVE | profile_id=%s by=%s", profile.pk, request.user)
        return Response({
            "success": True,
            "message": f"Resident '{profile.full_name}' approved and activated.",
            "data":    ResidentListSerializer(profile).data,
        })

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """
        POST /api/society-admin/residents/{id}/reject/
        Body (optional): { "reason": "Documents not verified." }

        Sets status=INACTIVE.
        """
        profile = self.get_object()
        if profile.status == UserProfile.Status.INACTIVE:
            return Response({"success": False, "message": "Resident is already inactive."}, status=400)

        ser = ResidentRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        profile.status = UserProfile.Status.INACTIVE
        if ser.validated_data.get("reason"):
            profile.description = ser.validated_data["reason"]
        profile.save(update_fields=["status", "description", "updated_at"])

        logger.warning("RESIDENT_REJECT | profile_id=%s by=%s reason=%s", profile.pk, request.user, ser.validated_data.get("reason"))
        return Response({
            "success": True,
            "message": f"Resident '{profile.full_name}' rejected.",
            "data":    ResidentListSerializer(profile).data,
        })

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """POST /api/society-admin/residents/{id}/deactivate/"""
        profile = self.get_object()
        profile.status = UserProfile.Status.INACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.warning("RESIDENT_DEACTIVATE | profile_id=%s by=%s", profile.pk, request.user)
        return Response({"success": True, "message": f"Resident '{profile.full_name}' deactivated."})

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        """POST /api/society-admin/residents/{id}/reactivate/"""
        profile = self.get_object()
        profile.status = UserProfile.Status.ACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.info("RESIDENT_REACTIVATE | profile_id=%s by=%s", profile.pk, request.user)
        return Response({"success": True, "message": f"Resident '{profile.full_name}' reactivated."})

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """GET /api/society-admin/residents/pending/ — only PENDING residents."""
        logger.info("RESIDENT_PENDING | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset()).filter(status=UserProfile.Status.PENDING)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ResidentListSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ResidentListSerializer(qs, many=True).data})

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        GET /api/society-admin/residents/dashboard/
        No params needed — scoped automatically to the admin's own society.
        """
        from apps.resident.profile.models import ResidentFlat

        # Always use the admin's own society — ignore any ?society= param
        society_id = self._get_admin_society_id()
        qs = self.get_queryset()   # already filtered to admin's society

        # Owners / Tenants from active ResidentFlat links in this society
        rf_qs = ResidentFlat.objects.filter(
            society_id=society_id,
            status=ResidentFlat.Status.ACTIVE,
        )
        owners  = rf_qs.filter(is_primary=True).count()
        tenants = rf_qs.filter(is_primary=False).count()

        return Response({
            "success": True,
            "data": {
                "total":    qs.count(),
                "active":   qs.filter(status=UserProfile.Status.ACTIVE).count(),
                "pending":  qs.filter(status=UserProfile.Status.PENDING).count(),
                "inactive": qs.filter(status=UserProfile.Status.INACTIVE).count(),
                "owners":   owners,
                "tenants":  tenants,
            },
        })
