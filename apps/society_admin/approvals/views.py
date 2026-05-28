import logging

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.society_admin.audit_logs.utils import log_society_action

from .models import ApprovalRequest
from .serializers import (
    ApprovalActionSerializer,
    ApprovalRejectSerializer,
    ApprovalRequestSerializer,
)

logger = logging.getLogger(__name__)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = ApprovalRequestSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status", "stage", "priority", "category"]  # 'society' removed — auto-scoped
    search_fields      = ["title", "description", "requester__user__email"]
    ordering_fields    = ["created_at", "priority", "progress", "reviewed_at"]
    ordering           = ["-created_at"]

    # ── Society helper ────────────────────────────────────────────────────────

    def _get_admin_society(self):
        try:
            society_id = self.request.user.profile.society_id
            if not society_id:
                raise ValueError
            return Society.objects.get(pk=society_id)
        except Exception:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Your account is not linked to any society.")

    # ── Queryset — always scoped to admin's society ───────────────────────────

    def get_queryset(self):
        society = self._get_admin_society()
        return (
            ApprovalRequest.objects
            .filter(society=society)
            .select_related(
                "society",
                "requester", "requester__user",
                "reviewer",  "reviewer__user",
                "visitor",
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        society = self._get_admin_society()
        try:
            profile = self.request.user.profile
        except Exception:
            profile = None
        # Society auto-injected — no need to pass it in the request body
        serializer.save(requester=profile, society=society)

    # ── KPI Dashboard (matches the 4 stat cards in the UI) ───────────────────

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        """
        GET /api/society-admin/approvals/kpi/
        Returns: Total, Pending Review, Approved, Rejected counts.
        No params needed — auto-scoped to admin's society.
        """
        qs = self.get_queryset()
        agg = qs.aggregate(
            total          = Count("id"),
            pending_review = Count("id", filter=Q(status=ApprovalRequest.Status.PENDING)),
            approved       = Count("id", filter=Q(status=ApprovalRequest.Status.APPROVED)),
            rejected       = Count("id", filter=Q(status=ApprovalRequest.Status.REJECTED)),
            cancelled      = Count("id", filter=Q(status=ApprovalRequest.Status.CANCELLED)),
        )
        return Response({"success": True, "data": agg})

    # ── Approve ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """POST /api/society-admin/approvals/{id}/approve/"""
        approval = self.get_object()
        if approval.status != ApprovalRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending approvals can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            profile = request.user.profile
        except Exception:
            profile = None

        approval.status         = ApprovalRequest.Status.APPROVED
        approval.stage          = ApprovalRequest.Stage.APPROVED
        approval.reviewer       = profile
        approval.reviewer_notes = ser.validated_data.get("reviewer_notes", "")
        approval.reviewed_at    = timezone.now()
        if "progress" in ser.validated_data:
            approval.progress = ser.validated_data["progress"]
        approval.save(update_fields=[
            "status", "stage", "reviewer", "reviewer_notes", "reviewed_at", "progress"
        ])
        logger.info("APPROVAL_APPROVE | id=%s by=%s", approval.pk, request.user)
        log_society_action(
            request=request, society_id=approval.society_id,
            action="approved", action_type="approve",
            target=approval.title, target_type="approval", target_id=str(approval.pk),
        )
        return Response({"success": True, "data": ApprovalRequestSerializer(approval).data})

    # ── Reject ────────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """POST /api/society-admin/approvals/{id}/reject/"""
        approval = self.get_object()
        if approval.status != ApprovalRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending approvals can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = ApprovalRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            profile = request.user.profile
        except Exception:
            profile = None

        approval.status         = ApprovalRequest.Status.REJECTED
        approval.stage          = ApprovalRequest.Stage.REJECTED
        approval.reviewer       = profile
        approval.reviewer_notes = ser.validated_data["reason"]
        approval.reviewed_at    = timezone.now()
        approval.save(update_fields=[
            "status", "stage", "reviewer", "reviewer_notes", "reviewed_at"
        ])
        logger.info("APPROVAL_REJECT | id=%s by=%s", approval.pk, request.user)
        log_society_action(
            request=request, society_id=approval.society_id,
            action="rejected", action_type="reject",
            target=approval.title, target_type="approval", target_id=str(approval.pk),
        )
        return Response({"success": True, "data": ApprovalRequestSerializer(approval).data})

    # ── Update Progress ───────────────────────────────────────────────────────

    @action(detail=True, methods=["patch"], url_path="progress")
    def update_progress(self, request, pk=None):
        """PATCH /api/society-admin/approvals/{id}/progress/  Body: { "progress": 75 }"""
        approval = self.get_object()
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        if "progress" in ser.validated_data:
            approval.progress = ser.validated_data["progress"]
            approval.save(update_fields=["progress"])

        logger.info("APPROVAL_PROGRESS | id=%s progress=%s", approval.pk, approval.progress)
        return Response({"success": True, "data": ApprovalRequestSerializer(approval).data})
