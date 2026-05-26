import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.common.permissions import IsSecurityGuard

from .models import EmergencyAlert
from .serializers import EmergencyAlertSerializer, RaiseAlertSerializer, ResolveAlertSerializer

logger = logging.getLogger(__name__)


class AlertPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class EmergencyAlertViewSet(viewsets.ViewSet):
    """
    Emergency alert management.

    GET    /api/security-guard/emergency-alerts/
    POST   /api/security-guard/emergency-alerts/
    GET    /api/security-guard/emergency-alerts/<id>/
    POST   /api/security-guard/emergency-alerts/<id>/resolve/
    """
    permission_classes = [IsSecurityGuard]

    def _sid(self, request):
        try:
            return request.user.profile.society_id
        except Exception:
            return None

    def list(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            EmergencyAlert.objects
            .filter(society_id=society_id)
            .select_related("raised_by", "resolved_by")
            .order_by("-raised_at")
        )

        alert_status = request.query_params.get("status")
        alert_type   = request.query_params.get("alert_type")
        if alert_status:
            qs = qs.filter(status=alert_status)
        if alert_type:
            qs = qs.filter(alert_type=alert_type)

        paginator = AlertPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(EmergencyAlertSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": EmergencyAlertSerializer(qs, many=True).data})

    def create(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = RaiseAlertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        with transaction.atomic():
            alert = EmergencyAlert.objects.create(
                society_id=society_id,
                raised_by=request.user.profile,
                **ser.validated_data,
            )

        logger.warning(
            "EMERGENCY_ALERT_RAISED | id=%s society=%s type=%s by=%s",
            alert.pk, society_id, alert.alert_type, request.user.profile.pk,
        )
        return Response(
            {"success": True, "message": "Emergency alert raised.", "data": EmergencyAlertSerializer(alert).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        society_id = self._sid(request)
        try:
            alert = EmergencyAlert.objects.select_related("raised_by", "resolved_by").get(
                pk=pk, society_id=society_id
            )
        except EmergencyAlert.DoesNotExist:
            return Response({"success": False, "message": "Alert not found."}, status=404)
        return Response({"success": True, "data": EmergencyAlertSerializer(alert).data})

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        """POST /api/security-guard/emergency-alerts/<id>/acknowledge/"""
        society_id = self._sid(request)
        try:
            alert = EmergencyAlert.objects.get(pk=pk, society_id=society_id)
        except EmergencyAlert.DoesNotExist:
            return Response({"success": False, "message": "Alert not found."}, status=404)

        if alert.status != EmergencyAlert.Status.ACTIVE:
            return Response(
                {"success": False, "message": f"Alert is already '{alert.status}' — cannot acknowledge."},
                status=400,
            )

        ser = ResolveAlertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        alert.status           = EmergencyAlert.Status.ACKNOWLEDGED
        alert.resolved_by      = request.user.profile
        alert.resolved_at      = timezone.now()
        alert.resolution_notes = ser.validated_data.get("resolution_notes", "")
        alert.save(update_fields=["status", "resolved_by", "resolved_at", "resolution_notes"])

        logger.info("EMERGENCY_ALERT_ACKNOWLEDGED | id=%s by=%s", alert.pk, request.user.profile.pk)
        return Response({"success": True, "message": "Alert acknowledged.", "data": EmergencyAlertSerializer(alert).data})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """POST /api/security-guard/emergency-alerts/<id>/resolve/"""
        society_id = self._sid(request)
        try:
            alert = EmergencyAlert.objects.get(pk=pk, society_id=society_id)
        except EmergencyAlert.DoesNotExist:
            return Response({"success": False, "message": "Alert not found."}, status=404)

        if alert.status == EmergencyAlert.Status.RESOLVED:
            return Response({"success": False, "message": "Alert is already resolved."}, status=400)

        ser = ResolveAlertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        alert.status           = EmergencyAlert.Status.RESOLVED
        alert.resolved_by      = request.user.profile
        alert.resolved_at      = timezone.now()
        alert.resolution_notes = ser.validated_data.get("resolution_notes", "")
        alert.save(update_fields=["status", "resolved_by", "resolved_at", "resolution_notes"])

        logger.info("EMERGENCY_ALERT_RESOLVED | id=%s by=%s", alert.pk, request.user.profile.pk)
        return Response({"success": True, "message": "Alert resolved.", "data": EmergencyAlertSerializer(alert).data})

    @action(detail=False, methods=["post"], url_path="acknowledge-all")
    def acknowledge_all(self, request):
        """POST /api/security-guard/emergency-alerts/acknowledge-all/ — bulk acknowledge all active alerts."""
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        updated = EmergencyAlert.objects.filter(
            society_id=society_id,
            status=EmergencyAlert.Status.ACTIVE,
        ).update(
            status=EmergencyAlert.Status.ACKNOWLEDGED,
            resolved_by=request.user.profile,
            resolved_at=timezone.now(),
        )

        logger.info("EMERGENCY_ALERT_ACK_ALL | society=%s count=%d by=%s", society_id, updated, request.user.profile.pk)
        return Response({"success": True, "message": f"{updated} alert(s) acknowledged.", "count": updated})

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/security-guard/emergency-alerts/stats/ — KPI counts for the dashboard cards."""
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = EmergencyAlert.objects.filter(society_id=society_id)
        active_count       = qs.filter(status=EmergencyAlert.Status.ACTIVE).count()
        acknowledged_count = qs.exclude(status=EmergencyAlert.Status.ACTIVE).count()

        return Response({
            "success": True,
            "data": {
                "active":       active_count,
                "acknowledged": acknowledged_count,
                "total":        qs.count(),
            },
        })
