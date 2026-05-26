import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.roles_permissions.models import UserProfile

from .serializers import ResidentApproveSerializer, ResidentListSerializer, ResidentRejectSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class SocietyResidentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Society Admin — manage and approve residents.

    GET    /api/society-admin/residents/
    GET    /api/society-admin/residents/{id}/
    POST   /api/society-admin/residents/{id}/approve/
    POST   /api/society-admin/residents/{id}/reject/
    POST   /api/society-admin/residents/{id}/deactivate/
    POST   /api/society-admin/residents/{id}/reactivate/
    GET    /api/society-admin/residents/pending/
    GET    /api/society-admin/residents/dashboard/
    """

    serializer_class = ResidentListSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "society", "role"]
    search_fields    = ["full_name", "mobile", "flat_number", "user__email"]
    ordering_fields  = ["full_name", "created_at", "status"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return (
            UserProfile.objects
            .select_related("user", "role", "society")
            .exclude(role__slug="super-admin")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        logger.info("RESIDENT_LIST | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ResidentListSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ResidentListSerializer(qs, many=True).data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({"success": True, "data": ResidentListSerializer(instance).data})

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
        qs   = self.filter_queryset(self.get_queryset()).filter(status=UserProfile.Status.PENDING)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ResidentListSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ResidentListSerializer(qs, many=True).data})

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """GET /api/society-admin/residents/dashboard/ — KPI summary."""
        qs = self.get_queryset()
        society_id = get_society_id(request)
        if society_id:
            qs = qs.filter(society_id=society_id)

        return Response({
            "success": True,
            "data": {
                "total":    qs.count(),
                "active":   qs.filter(status=UserProfile.Status.ACTIVE).count(),
                "pending":  qs.filter(status=UserProfile.Status.PENDING).count(),
                "inactive": qs.filter(status=UserProfile.Status.INACTIVE).count(),
            },
        })