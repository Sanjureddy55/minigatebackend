import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.common.permissions import IsSecurityGuard

from .models import VehicleLog
from .serializers import VehicleLogCreateSerializer, VehicleLogSerializer

logger = logging.getLogger(__name__)


class VehicleLogPagination(PageNumberPagination):
    page_size             = 50
    page_size_query_param = "page_size"
    max_page_size         = 200


class VehicleLogViewSet(viewsets.ViewSet):
    """
    Vehicle tracking — log vehicle movements in/out of the society.

    GET    /api/security-guard/vehicle-tracking/
    POST   /api/security-guard/vehicle-tracking/
    GET    /api/security-guard/vehicle-tracking/<id>/
    GET    /api/security-guard/vehicle-tracking/summary/
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
            VehicleLog.objects
            .filter(society_id=society_id)
            .select_related("flat", "flat__building", "logged_by")
            .order_by("-logged_at")
        )

        vehicle_type = request.query_params.get("vehicle_type")
        action_param = request.query_params.get("action")
        date_str     = request.query_params.get("date")
        search       = request.query_params.get("search")

        if vehicle_type:
            qs = qs.filter(vehicle_type=vehicle_type)
        if action_param:
            qs = qs.filter(action=action_param)
        if date_str:
            qs = qs.filter(logged_at__date=date_str)
        if search:
            qs = qs.filter(
                Q(vehicle_number__icontains=search) | Q(owner_name__icontains=search)
            )

        paginator = VehicleLogPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(VehicleLogSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": VehicleLogSerializer(qs, many=True).data})

    def create(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = VehicleLogCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        log = ser.save(
            society_id=society_id,
            logged_by=request.user.profile,
        )
        logger.info(
            "VEHICLE_LOG | id=%s society=%s vehicle=%s action=%s",
            log.pk, society_id, log.vehicle_number, log.action,
        )
        return Response(
            {"success": True, "message": "Vehicle movement logged.", "data": VehicleLogSerializer(log).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        society_id = self._sid(request)
        try:
            log = VehicleLog.objects.select_related("flat", "flat__building", "logged_by").get(
                pk=pk, society_id=society_id
            )
        except VehicleLog.DoesNotExist:
            return Response({"success": False, "message": "Record not found."}, status=404)
        return Response({"success": True, "data": VehicleLogSerializer(log).data})

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """GET /api/security-guard/vehicle-tracking/summary/ — today's vehicle movement breakdown"""
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()
        qs    = VehicleLog.objects.filter(society_id=society_id, logged_at__date=today)

        by_type   = {vt.value: qs.filter(vehicle_type=vt.value).count() for vt in VehicleLog.VehicleType}
        in_count  = qs.filter(action=VehicleLog.Action.IN).count()
        out_count = qs.filter(action=VehicleLog.Action.OUT).count()

        return Response({
            "success": True,
            "data": {
                "date":      str(today),
                "total":     qs.count(),
                "entries":   in_count,
                "exits":     out_count,
                "in_count":  in_count,
                "out_count": out_count,
                "by_type":   by_type,
            },
        })
