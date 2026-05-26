import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.common.permissions import IsMaintenanceStaff
from apps.maintenance_staff.assigned_tasks.models import MaintenanceTask
from .models import TaskUpdate

logger = logging.getLogger(__name__)


class TaskUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True, allow_null=True)
    task_id_display = serializers.CharField(source="task.task_id", read_only=True)

    class Meta:
        model  = TaskUpdate
        fields = ["id", "task", "task_id_display", "update_note", "status", "updated_by", "updated_by_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class TaskUpdateListCreateView(APIView):
    """
    GET  /api/maintenance-staff/task-updates/?task=<id>
    POST /api/maintenance-staff/task-updates/
    """
    permission_classes = [IsMaintenanceStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        task_id = request.query_params.get("task")
        qs = TaskUpdate.objects.filter(task__society_id=society_id).select_related("updated_by", "task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return Response({"success": True, "count": qs.count(), "results": TaskUpdateSerializer(qs, many=True).data})

    def post(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = TaskUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = ser.validated_data.get("task")
        if task and str(task.society_id) != str(society_id):
            return Response({"success": False, "message": "Task not in your society."}, status=403)
        update = ser.save(updated_by=request.user.profile)
        logger.info("TASK_UPDATE | update=%s task=%s by=%s", update.pk, update.task_id, request.user.pk)
        return Response(
            {"success": True, "data": TaskUpdateSerializer(update).data},
            status=status.HTTP_201_CREATED,
        )
