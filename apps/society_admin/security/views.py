import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.society_admin.staff_guards.models import StaffMember
from apps.society_admin.visitors.models import Visitor

from .models import Gate, SecurityAlert
from apps.common.utils import get_society_id
from .serializers import (
    GateSerializer,
    SecurityAlertSerializer,
    SecurityDashboardSerializer,
)

logger = logging.getLogger(__name__)


class GateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """CRUD for society gates + open/close actions."""

    queryset         = Gate.objects.select_related("society")
    serializer_class = GateSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["society", "status"]

    @action(detail=True, methods=["post"], url_path="open")
    def open_gate(self, request, pk=None):
        gate = self.get_object()
        gate.status = Gate.Status.OPEN
        gate.save(update_fields=["status", "updated_at"])
        logger.info("GATE_OPEN | gate=%s | by=%s", gate.pk, request.user)
        return Response(GateSerializer(gate).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close_gate(self, request, pk=None):
        gate = self.get_object()
        gate.status = Gate.Status.CLOSED
        gate.save(update_fields=["status", "updated_at"])
        logger.info("GATE_CLOSE | gate=%s | by=%s", gate.pk, request.user)
        return Response(GateSerializer(gate).data)


class SecurityAlertViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    CRUD for security alerts.

    POST /<id>/acknowledge/  — mark acknowledged
    POST /<id>/resolve/      — mark resolved
    """

    queryset = (
        SecurityAlert.objects
        .select_related("society", "acknowledged_by")
        .order_by("-triggered_at")
    )
    serializer_class  = SecurityAlertSerializer
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["society", "status", "alert_type"]
    search_fields     = ["description", "gate"]
    ordering_fields   = ["triggered_at", "status"]
    ordering          = ["-triggered_at"]

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        if alert.status != SecurityAlert.Status.ACTIVE:
            return Response({"detail": "Alert is not active."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = request.user.profile
        except Exception:
            profile = None

        alert.status          = SecurityAlert.Status.ACKNOWLEDGED
        alert.acknowledged_by = profile
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=["status", "acknowledged_by", "acknowledged_at"])
        logger.info("ALERT_ACK | alert=%s | by=%s", alert.pk, request.user)
        return Response(SecurityAlertSerializer(alert).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        alert = self.get_object()
        if alert.status == SecurityAlert.Status.RESOLVED:
            return Response({"detail": "Alert is already resolved."}, status=status.HTTP_400_BAD_REQUEST)

        alert.status      = SecurityAlert.Status.RESOLVED
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "resolved_at"])
        logger.info("ALERT_RESOLVE | alert=%s | by=%s", alert.pk, request.user)
        return Response(SecurityAlertSerializer(alert).data)


class SecurityDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/security/dashboard/?society=<id>

    Returns:
      open_gates, total_gates, guards_on_duty, total_guards,
      active_alerts, events_today, active_alert_list
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        today = timezone.localdate()

        gates_qs   = Gate.objects.filter(society_id=society_id)
        open_gates = gates_qs.filter(status=Gate.Status.OPEN).count()
        total_gates = gates_qs.count()

        guards_qs     = StaffMember.objects.filter(
            society_id=society_id,
            role=StaffMember.Role.SECURITY_GUARD,
        )
        total_guards   = guards_qs.filter(status=StaffMember.Status.ACTIVE).count()
        guards_on_duty = guards_qs.filter(
            status=StaffMember.Status.ACTIVE,
        ).count()

        alert_qs      = SecurityAlert.objects.filter(society_id=society_id)
        active_alerts = alert_qs.filter(status=SecurityAlert.Status.ACTIVE).count()
        active_list   = alert_qs.filter(status=SecurityAlert.Status.ACTIVE).select_related("acknowledged_by")[:10]

        events_today = Visitor.objects.filter(
            society_id=society_id,
            created_at__date=today,
        ).count()

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
            "success": True,
            "data":    SecurityDashboardSerializer(data).data,
        })