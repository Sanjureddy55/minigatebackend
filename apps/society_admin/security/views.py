import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.security_guard.shift_management.models import GuardShift
from apps.security_guard.shift_management.serializers import GuardShiftSerializer
from apps.society_admin.staff_guards.models import StaffMember
from apps.society_admin.visitors.models import Visitor

from .models import Gate, SecurityAlert
from .serializers import (
    GateSerializer,
    SecurityAlertSerializer,
    SecurityDashboardSerializer,
)

logger = logging.getLogger(__name__)


# ── Shared helper ─────────────────────────────────────────────────────────────

def _admin_society_id(request):
    """
    Returns the society_id from the logged-in admin's profile.
    Raises PermissionDenied if account is not linked to a society.
    """
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return sid
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


# ── Gates ─────────────────────────────────────────────────────────────────────

class GateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = GateSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["status"]          # 'society' removed — auto-scoped

    def get_queryset(self):
        return Gate.objects.filter(
            society_id=_admin_society_id(self.request)
        ).select_related("society")

    def perform_create(self, serializer):
        sid = _admin_society_id(self.request)
        society = Society.objects.get(pk=sid)
        serializer.save(society=society)

    @action(detail=True, methods=["post"], url_path="open")
    def open_gate(self, request, pk=None):
        """POST /api/society-admin/security/gates/{id}/open/"""
        gate = self.get_object()
        gate.status = Gate.Status.OPEN
        gate.save(update_fields=["status", "updated_at"])
        logger.info("GATE_OPEN | gate=%s by=%s", gate.pk, request.user)
        return Response({"success": True, "data": GateSerializer(gate).data})

    @action(detail=True, methods=["post"], url_path="close")
    def close_gate(self, request, pk=None):
        """POST /api/society-admin/security/gates/{id}/close/"""
        gate = self.get_object()
        gate.status = Gate.Status.CLOSED
        gate.save(update_fields=["status", "updated_at"])
        logger.info("GATE_CLOSE | gate=%s by=%s", gate.pk, request.user)
        return Response({"success": True, "data": GateSerializer(gate).data})


# ── Security Alerts ───────────────────────────────────────────────────────────

class SecurityAlertViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = SecurityAlertSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status", "alert_type"]   # 'society' removed — auto-scoped
    search_fields      = ["description", "gate"]
    ordering_fields    = ["triggered_at", "status"]
    ordering           = ["-triggered_at"]

    def get_queryset(self):
        return (
            SecurityAlert.objects
            .filter(society_id=_admin_society_id(self.request))
            .select_related("society", "acknowledged_by")
            .order_by("-triggered_at")
        )

    def perform_create(self, serializer):
        sid = _admin_society_id(self.request)
        society = Society.objects.get(pk=sid)
        serializer.save(society=society)

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        """POST /api/society-admin/security/alerts/{id}/acknowledge/"""
        alert = self.get_object()
        if alert.status != SecurityAlert.Status.ACTIVE:
            return Response(
                {"detail": "Alert is not active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            profile = request.user.profile
        except Exception:
            profile = None

        alert.status          = SecurityAlert.Status.ACKNOWLEDGED
        alert.acknowledged_by = profile
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=["status", "acknowledged_by", "acknowledged_at"])
        logger.info("ALERT_ACK | alert=%s by=%s", alert.pk, request.user)
        return Response({"success": True, "data": SecurityAlertSerializer(alert).data})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """POST /api/society-admin/security/alerts/{id}/resolve/"""
        alert = self.get_object()
        if alert.status == SecurityAlert.Status.RESOLVED:
            return Response(
                {"detail": "Alert is already resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        alert.status      = SecurityAlert.Status.RESOLVED
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "resolved_at"])
        logger.info("ALERT_RESOLVE | alert=%s by=%s", alert.pk, request.user)
        return Response({"success": True, "data": SecurityAlertSerializer(alert).data})


# ── Security Dashboard ────────────────────────────────────────────────────────

class SecurityDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        """
        GET /api/society-admin/security/dashboard/
        No params needed — auto-scoped to the admin's own society.

        Returns the 4 stat cards:
          open_gates / total_gates  → "2 / 3  Open Gates"
          guards_on_duty / total    → "3 / 4  Guards on Duty"
          active_alerts             → "3  Active Alerts"
          events_today              → "412  Events Today"
        Plus: active_alert_list (right panel), live_entry_log
        """
        sid   = _admin_society_id(request)
        today = timezone.localdate()

        # Gates
        gates_qs    = Gate.objects.filter(society_id=sid)
        open_gates  = gates_qs.filter(status=Gate.Status.OPEN).count()
        total_gates = gates_qs.count()

        # Guards on duty
        guards_qs      = StaffMember.objects.filter(
            society_id=sid,
            role=StaffMember.Role.SECURITY_GUARD,
            status=StaffMember.Status.ACTIVE,
        )
        total_guards   = guards_qs.count()
        guards_on_duty = total_guards   # all active guards are considered on duty

        # Alerts
        alert_qs      = SecurityAlert.objects.filter(society_id=sid)
        active_alerts = alert_qs.filter(status=SecurityAlert.Status.ACTIVE).count()
        active_list   = (
            alert_qs
            .filter(status=SecurityAlert.Status.ACTIVE)
            .select_related("acknowledged_by")
            .order_by("-triggered_at")[:10]
        )

        # Events today = all visitors logged today
        events_today = Visitor.objects.filter(
            society_id=sid,
            created_at__date=today,
        ).count()

        # Live entry/exit log = latest 20 visitors
        from apps.society_admin.visitors.serializers import VisitorSerializer
        live_log = (
            Visitor.objects
            .filter(society_id=sid)
            .select_related("flat", "flat__building")
            .order_by("-created_at")[:20]
        )

        data = {
            "open_gates":        open_gates,
            "total_gates":       total_gates,
            "guards_on_duty":    guards_on_duty,
            "total_guards":      total_guards,
            "active_alerts":     active_alerts,
            "events_today":      events_today,
            "active_alert_list": active_list,
        }
        return Response({
            "success":        True,
            "data":           SecurityDashboardSerializer(data).data,
            "live_entry_log": VisitorSerializer(live_log, many=True).data,
        })


# ── Guard Roster ──────────────────────────────────────────────────────────────

class GuardRosterView(APIView):
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        """
        GET /api/society-admin/security/guard-roster/

        Returns guard shifts for the admin's society.
        Matches the "Guard roster" panel showing name, gate, time, On Duty/Off Duty.

        Query params (all optional):
          ?date=YYYY-MM-DD   (default: today)
          ?status=scheduled|active|completed|absent
          ?guard=<profile_id>
        """
        sid   = _admin_society_id(request)
        today = timezone.localdate()

        date_str = request.query_params.get("date", str(today))
        qs = (
            GuardShift.objects
            .filter(society_id=sid, shift_date=date_str)
            .select_related("guard")
            .order_by("start_time")
        )

        shift_status = request.query_params.get("status")
        if shift_status:
            qs = qs.filter(status=shift_status)

        guard_id = request.query_params.get("guard")
        if guard_id:
            qs = qs.filter(guard_id=guard_id)

        # Build roster with on_duty flag for the UI badge
        roster = []
        for shift in qs:
            roster.append({
                **GuardShiftSerializer(shift).data,
                "on_duty":      shift.status == GuardShift.Status.ACTIVE,
                "duty_label":   "On Duty" if shift.status == GuardShift.Status.ACTIVE else "Off Duty",
                "shift_time":   f"{shift.start_time.strftime('%H:%M')} - {shift.end_time.strftime('%H:%M')}",
            })

        return Response({
            "success": True,
            "date":    date_str,
            "count":   len(roster),
            "results": roster,
        })

    def post(self, request):
        """
        POST /api/society-admin/security/guard-roster/
        Schedule a guard shift.

        Body:
          {
            "guard":         <profile_id>,
            "shift_date":    "2026-05-28",
            "start_time":    "06:00:00",
            "end_time":      "14:00:00",
            "gate_assigned": "Gate 1 (Main)",
            "status":        "scheduled"
          }
        """
        sid     = _admin_society_id(request)
        society = Society.objects.get(pk=sid)

        data = request.data.copy()
        data["society"] = society.pk

        ser = GuardShiftSerializer(data=data)
        ser.is_valid(raise_exception=True)
        shift = ser.save(society=society)

        logger.info("GUARD_SHIFT_CREATE | shift=%s society=%s by=%s", shift.pk, sid, request.user)
        return Response(
            {
                "success": True,
                "message": "Guard shift scheduled.",
                "data": {
                    **GuardShiftSerializer(shift).data,
                    "on_duty":    shift.status == GuardShift.Status.ACTIVE,
                    "duty_label": "On Duty" if shift.status == GuardShift.Status.ACTIVE else "Off Duty",
                    "shift_time": f"{shift.start_time.strftime('%H:%M')} - {shift.end_time.strftime('%H:%M')}",
                },
            },
            status=status.HTTP_201_CREATED,
        )
