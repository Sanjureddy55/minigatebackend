import logging

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsSocietyAdmin

from apps.society_admin.audit_logs.utils import log_society_action

from .models import ApprovalRequest
from apps.common.utils import get_society_id
from .serializers import (
    ApprovalActionSerializer,
    ApprovalRejectSerializer,
    ApprovalRequestSerializer,
)

logger = logging.getLogger(__name__)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    queryset = (
        ApprovalRequest.objects
        .select_related(
            "society",
            "requester", "requester__user",
            "reviewer",  "reviewer__user",
            "visitor",
        )
        .order_by("-created_at")
    )
    serializer_class = ApprovalRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "status", "stage", "priority", "category"]
    search_fields = ["title", "description", "requester__user__email"]
    ordering_fields = ["created_at", "priority", "progress", "reviewed_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
        except Exception:
            profile = None
        serializer.save(requester=profile)

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
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

        approval.status        = ApprovalRequest.Status.APPROVED
        approval.stage         = ApprovalRequest.Stage.APPROVED
        approval.reviewer      = profile
        approval.reviewer_notes = ser.validated_data.get("reviewer_notes", "")
        approval.reviewed_at   = timezone.now()
        if "progress" in ser.validated_data:
            approval.progress  = ser.validated_data["progress"]
        approval.save(update_fields=[
            "status", "stage", "reviewer", "reviewer_notes", "reviewed_at", "progress"
        ])
        logger.info("APPROVAL_APPROVE | id=%s | by=%s", approval.pk, request.user)
        log_society_action(
            request=request, society_id=approval.society_id,
            action="approved", action_type="approve",
            target=approval.title, target_type="approval", target_id=str(approval.pk),
        )
        return Response(ApprovalRequestSerializer(approval).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
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
        logger.info("APPROVAL_REJECT | id=%s | by=%s", approval.pk, request.user)
        log_society_action(
            request=request, society_id=approval.society_id,
            action="rejected", action_type="reject",
            target=approval.title, target_type="approval", target_id=str(approval.pk),
        )
        return Response(ApprovalRequestSerializer(approval).data)

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        """GET /kpi/?society=<id> — approval workflow KPIs."""
        society_id = get_society_id(request)
        qs = ApprovalRequest.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        agg = qs.aggregate(
            total          = Count("id"),
            pending_review = Count("id", filter=Q(status=ApprovalRequest.Status.PENDING)),
            approved       = Count("id", filter=Q(status=ApprovalRequest.Status.APPROVED)),
            rejected       = Count("id", filter=Q(status=ApprovalRequest.Status.REJECTED)),
        )
        return Response({"success": True, "data": agg})

    @action(detail=True, methods=["patch"], url_path="progress")
    def update_progress(self, request, pk=None):
        approval = self.get_object()
        ser = ApprovalActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        if "progress" in ser.validated_data:
            approval.progress = ser.validated_data["progress"]
            approval.save(update_fields=["progress"])

        logger.info("APPROVAL_PROGRESS | id=%s | progress=%s", approval.pk, approval.progress)
        return Response(ApprovalRequestSerializer(approval).data)