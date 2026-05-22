import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsResident

from apps.roles_permissions.models import UserProfile

from .models import SOSAlert
from .serializers import SOSAlertSerializer, SOSResolveSerializer

logger = logging.getLogger(__name__)


class SOSAlertViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Resident SOS Emergency alerts.

    POST   /api/resident/sos/                   Trigger SOS alert
    GET    /api/resident/sos/                   List alerts (filter by flat/society/status)
    GET    /api/resident/sos/{id}/              Alert detail
    POST   /api/resident/sos/{id}/resolve/      Resolve alert (admin action)
    GET    /api/resident/sos/active/            All active alerts for a society
    """

    serializer_class = SOSAlertSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["flat", "society", "status", "alert_type", "resident"]
    search_fields    = ["message", "location", "resident__full_name"]
    ordering_fields  = ["triggered_at", "status", "alert_type"]
    ordering         = ["-triggered_at"]

    def get_queryset(self):
        return (
            SOSAlert.objects
            .select_related("resident", "flat", "society", "resolved_by")
            .order_by("-triggered_at")
        )

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SOSAlertSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": SOSAlertSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = SOSAlertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.critical(
            "SOS_TRIGGERED | id=%s type=%s resident=%s flat=%s society=%s location='%s'",
            obj.pk, obj.alert_type, obj.resident_id, obj.flat_id, obj.society_id, obj.location,
        )
        return Response(
            {
                "success": True,
                "message": "SOS alert triggered. Security and admins have been notified.",
                "helplines": {
                    "police":    "100",
                    "ambulance": "108",
                    "fire":      "101",
                },
                "data": SOSAlertSerializer(obj).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": SOSAlertSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = SOSAlertSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": SOSAlertSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == SOSAlert.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Cannot delete an active SOS alert. Resolve it first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.delete()
        return Response({"success": True, "message": "SOS alert deleted."})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """
        POST /api/resident/sos/{id}/resolve/
        Body: { "resolved_by": <profile_id>, "resolution_note": "Situation handled." }
        """
        obj = self.get_object()
        if obj.status == SOSAlert.Status.RESOLVED:
            return Response({"success": False, "message": "Alert already resolved."}, status=400)

        ser = SOSResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            resolver = UserProfile.objects.get(pk=ser.validated_data["resolved_by"])
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Resolver profile not found."}, status=404)

        obj.status          = SOSAlert.Status.RESOLVED
        obj.resolved_at     = timezone.now()
        obj.resolved_by     = resolver
        obj.resolution_note = ser.validated_data.get("resolution_note", "")
        obj.save(update_fields=["status", "resolved_at", "resolved_by", "resolution_note"])

        logger.info("SOS_RESOLVED | id=%s type=%s by=%s", obj.pk, obj.alert_type, resolver.pk)
        return Response({
            "success": True,
            "message": "SOS alert resolved.",
            "data":    SOSAlertSerializer(obj).data,
        })

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        """GET /api/resident/sos/active/?society=<id> — Society Admin: all active alerts."""
        qs = self.filter_queryset(self.get_queryset()).filter(status=SOSAlert.Status.ACTIVE)
        society_id = request.query_params.get("society")
        if society_id:
            qs = qs.filter(society_id=society_id)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SOSAlertSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": SOSAlertSerializer(qs, many=True).data})