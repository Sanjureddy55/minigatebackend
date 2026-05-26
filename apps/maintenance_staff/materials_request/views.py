import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.common.permissions import IsMaintenanceStaff
from .models import MaterialsRequest

logger = logging.getLogger(__name__)


class MaterialsRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True, allow_null=True)
    approved_by_name  = serializers.CharField(source="approved_by.full_name",  read_only=True, allow_null=True)
    task_id_display   = serializers.CharField(source="task.task_id",           read_only=True, allow_null=True)
    status_display    = serializers.CharField(source="get_status_display",     read_only=True)

    class Meta:
        model  = MaterialsRequest
        fields = [
            "id", "task", "task_id_display", "material_name", "quantity", "reason",
            "status", "status_display",
            "requested_by", "requested_by_name",
            "approved_by",  "approved_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MaterialsRequestListCreateView(APIView):
    """
    GET  /api/maintenance-staff/materials-requests/
    POST /api/maintenance-staff/materials-requests/
    """
    permission_classes = [IsMaintenanceStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            MaterialsRequest.objects
            .filter(society_id=society_id)
            .select_related("task", "requested_by", "approved_by")
            .order_by("-created_at")
        )
        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)
        return Response({"success": True, "count": qs.count(), "results": MaterialsRequestSerializer(qs, many=True).data})

    def post(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = MaterialsRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        req = ser.save(society_id=society_id, requested_by=request.user.profile)
        logger.info("MATERIALS_REQ | id=%s by=%s", req.pk, request.user.pk)
        return Response(
            {"success": True, "data": MaterialsRequestSerializer(req).data},
            status=status.HTTP_201_CREATED,
        )


class MaterialsRequestDetailView(APIView):
    """PATCH /api/maintenance-staff/materials-requests/<id>/"""
    permission_classes = [IsMaintenanceStaff]

    def patch(self, request, pk):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)
        try:
            req = MaterialsRequest.objects.get(pk=pk, society_id=society_id)
        except MaterialsRequest.DoesNotExist:
            return Response({"success": False, "message": "Not found."}, status=404)
        ser = MaterialsRequestSerializer(req, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response({"success": True, "data": MaterialsRequestSerializer(req).data})
