import logging
from datetime import date

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.society_admin.audit_logs.utils import log_society_action

from .models import Visitor
from apps.common.utils import get_society_id
from .serializers import (
    VisitorApproveSerializer,
    VisitorDashboardSerializer,
    VisitorRejectSerializer,
    VisitorSerializer,
)

logger = logging.getLogger(__name__)


class VisitorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    queryset = (
        Visitor.objects
        .select_related(
            "society",
            "flat", "flat__building",
            "approved_by", "approved_by__user",
        )
        .order_by("-created_at")
    )
    serializer_class = VisitorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "status", "visit_type", "flat"]
    search_fields = ["full_name", "mobile", "host_name", "vehicle_number"]
    ordering_fields = ["created_at", "checked_in_at", "checked_out_at", "full_name"]
    ordering = ["-created_at"]

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        visitor = self.get_object()
        if visitor.status != Visitor.Status.PENDING:
            return Response(
                {"detail": "Only pending visitors can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = VisitorApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        visitor.status = Visitor.Status.APPROVED
        try:
            profile = request.user.profile
            visitor.approved_by = profile
        except Exception:
            pass
        visitor.save(update_fields=["status", "approved_by"])
        logger.info("VISITOR_APPROVE | visitor=%s | by=%s", visitor.pk, request.user)
        flat_label = visitor.flat.flat_number if visitor.flat_id else ""
        log_society_action(
            request=request, society_id=visitor.society_id,
            action="approved visitor", action_type="approve",
            target=f"{visitor.full_name} → {flat_label}" if flat_label else visitor.full_name,
            target_type="visitor", target_id=str(visitor.pk),
        )
        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        visitor = self.get_object()
        if visitor.status != Visitor.Status.PENDING:
            return Response(
                {"detail": "Only pending visitors can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = VisitorRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        visitor.status = Visitor.Status.REJECTED
        visitor.rejected_reason = ser.validated_data["reason"]
        visitor.save(update_fields=["status", "rejected_reason"])
        logger.info("VISITOR_REJECT | visitor=%s | by=%s", visitor.pk, request.user)
        log_society_action(
            request=request, society_id=visitor.society_id,
            action="rejected visitor", action_type="reject",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        from django.utils import timezone

        visitor = self.get_object()
        if visitor.status != Visitor.Status.APPROVED:
            return Response(
                {"detail": "Only approved visitors can check in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visitor.status = Visitor.Status.INSIDE
        visitor.checked_in_at = timezone.now()
        visitor.save(update_fields=["status", "checked_in_at"])
        logger.info("VISITOR_CHECKIN | visitor=%s | by=%s", visitor.pk, request.user)
        flat_label = visitor.flat.flat_number if visitor.flat_id else ""
        log_society_action(
            request=request, society_id=visitor.society_id,
            action="checked in", action_type="check_in",
            target=f"Visitor → {flat_label}" if flat_label else f"Visitor {visitor.full_name}",
            target_type="visitor", target_id=str(visitor.pk),
        )
        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        from django.utils import timezone

        visitor = self.get_object()
        if visitor.status != Visitor.Status.INSIDE:
            return Response(
                {"detail": "Visitor is not currently inside."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visitor.status = Visitor.Status.EXITED
        visitor.checked_out_at = timezone.now()
        visitor.save(update_fields=["status", "checked_out_at"])
        logger.info("VISITOR_CHECKOUT | visitor=%s | by=%s", visitor.pk, request.user)
        log_society_action(
            request=request, society_id=visitor.society_id,
            action="checked out", action_type="check_out",
            target=f"Visitor {visitor.full_name}", target_type="visitor", target_id=str(visitor.pk),
        )
        return Response(VisitorSerializer(visitor).data)


class VisitorDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    def get(self, request):
        society_id = get_society_id(request)
        qs = Visitor.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        today = date.today()
        today_qs = qs.filter(created_at__date=today)

        from django.db.models import Count
        by_visit_type = list(
            qs.values("visit_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = {
            "total_today":      today_qs.count(),
            "currently_inside": qs.filter(status=Visitor.Status.INSIDE).count(),
            "pending_approval": qs.filter(status=Visitor.Status.PENDING).count(),
            "rejected_today":   today_qs.filter(status=Visitor.Status.REJECTED).count(),
            "by_visit_type":    by_visit_type,
        }
        ser = VisitorDashboardSerializer(data)
        return Response(ser.data)