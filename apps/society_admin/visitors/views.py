import logging
from datetime import date

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.society_admin.audit_logs.utils import log_society_action

from .models import Visitor
from .serializers import (
    VisitorApproveSerializer,
    VisitorDashboardSerializer,
    VisitorRegisterSerializer,
    VisitorRejectSerializer,
    VisitorSerializer,
)

logger = logging.getLogger(__name__)


class VisitorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = VisitorSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status", "visit_type", "flat"]   # 'society' removed — auto-scoped
    search_fields      = ["full_name", "mobile", "host_name", "vehicle_number"]
    ordering_fields    = ["created_at", "checked_in_at", "checked_out_at", "full_name"]
    ordering           = ["-created_at"]

    # ── Society helper ────────────────────────────────────────────────────────

    def _get_admin_society(self):
        """Returns the Society object for the logged-in admin. Raises 403 if not linked."""
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
            Visitor.objects
            .filter(society=society)
            .select_related(
                "society",
                "flat", "flat__building",
                "approved_by", "approved_by__user",
            )
            .order_by("-created_at")
        )

    # ── Register (simple create matching the UI form) ─────────────────────────

    @action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        """
        POST /api/society-admin/visitors/register/

        Simple visitor registration — mirrors the 'Register Visitor' UI form.
        Society is auto-detected from logged-in admin. Flat resolved by flat_number.

        Body:
          {
            "full_name":      "Rahul Kumar",
            "mobile":         "9876543210",
            "visit_type":     "guest",
            "flat_number":    "A-402",
            "purpose":        "Personal visit",
            "host_name":      "Aarav Sharma",
            "vehicle_number": "MH12AB1234"
          }
        """
        society = self._get_admin_society()

        ser = VisitorRegisterSerializer(
            data=request.data,
            context={"request": request, "society": society},
        )
        ser.is_valid(raise_exception=True)
        vd = ser.validated_data

        visitor = Visitor.objects.create(
            full_name      = vd["full_name"],
            mobile         = vd["mobile"],
            visit_type     = vd["visit_type"],
            purpose        = vd.get("purpose", ""),
            host_name      = vd.get("host_name", ""),
            vehicle_number = vd.get("vehicle_number", ""),
            society        = society,
            flat           = vd["flat"],
            status         = Visitor.Status.PENDING,
        )

        log_society_action(
            request=request, society_id=society.pk,
            action="registered visitor", action_type="create",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        logger.info("VISITOR_REGISTER | visitor=%s society=%s by=%s", visitor.pk, society.pk, request.user)

        return Response(
            {
                "success": True,
                "message": f"Visitor '{visitor.full_name}' registered. Status: Pending approval.",
                "data": VisitorSerializer(visitor).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── Approve ───────────────────────────────────────────────────────────────

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
            visitor.approved_by = request.user.profile
        except Exception:
            pass
        visitor.save(update_fields=["status", "approved_by"])

        log_society_action(
            request=request, society_id=visitor.society_id,
            action="approved visitor", action_type="approve",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        logger.info("VISITOR_APPROVE | visitor=%s by=%s", visitor.pk, request.user)
        return Response({"success": True, "data": VisitorSerializer(visitor).data})

    # ── Reject ────────────────────────────────────────────────────────────────

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

        log_society_action(
            request=request, society_id=visitor.society_id,
            action="rejected visitor", action_type="reject",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        logger.info("VISITOR_REJECT | visitor=%s by=%s", visitor.pk, request.user)
        return Response({"success": True, "data": VisitorSerializer(visitor).data})

    # ── Check-in ──────────────────────────────────────────────────────────────

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

        log_society_action(
            request=request, society_id=visitor.society_id,
            action="checked in visitor", action_type="check_in",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        logger.info("VISITOR_CHECKIN | visitor=%s by=%s", visitor.pk, request.user)
        return Response({"success": True, "data": VisitorSerializer(visitor).data})

    # ── Check-out ─────────────────────────────────────────────────────────────

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

        log_society_action(
            request=request, society_id=visitor.society_id,
            action="checked out visitor", action_type="check_out",
            target=visitor.full_name, target_type="visitor", target_id=str(visitor.pk),
        )
        logger.info("VISITOR_CHECKOUT | visitor=%s by=%s", visitor.pk, request.user)
        return Response({"success": True, "data": VisitorSerializer(visitor).data})


# ── Dashboard ─────────────────────────────────────────────────────────────────

class VisitorDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        """
        GET /api/society-admin/visitors/dashboard/
        No params needed — auto-scoped to the admin's own society.
        """
        try:
            society_id = request.user.profile.society_id
        except Exception:
            society_id = None

        qs = Visitor.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        today     = date.today()
        today_qs  = qs.filter(created_at__date=today)

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
            "rejected_today":   qs.filter(
                status=Visitor.Status.REJECTED,
                updated_at__date=today,
            ).count(),
            "total_rejected":   qs.filter(status=Visitor.Status.REJECTED).count(),
            "by_visit_type":    by_visit_type,
        }
        return Response(VisitorDashboardSerializer(data).data)
