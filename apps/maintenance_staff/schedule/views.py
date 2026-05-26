import logging
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.common.permissions import IsMaintenanceStaff
from .models import MaintenanceSchedule

logger = logging.getLogger(__name__)


class ScheduleSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, allow_null=True)
    task_id_display  = serializers.CharField(source="task.task_id",          read_only=True, allow_null=True)
    task_title       = serializers.CharField(source="task.title",            read_only=True, allow_null=True)
    status_display   = serializers.CharField(source="get_status_display",    read_only=True)

    class Meta:
        model  = MaintenanceSchedule
        fields = [
            "id", "task", "task_id_display", "task_title",
            "title", "location",
            "assigned_to", "assigned_to_name",
            "scheduled_date", "start_time", "end_time",
            "status", "status_display", "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MaintenanceScheduleView(APIView):
    """GET /api/maintenance-staff/schedule/"""
    permission_classes = [IsMaintenanceStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        profile   = request.user.profile
        role_slug = getattr(getattr(profile, "role", None), "slug", "")

        qs = (
            MaintenanceSchedule.objects
            .filter(society=society_id)
            .select_related("task", "assigned_to")
            .order_by("scheduled_date", "start_time")
        )
        if role_slug == "maintenance-staff":
            qs = qs.filter(assigned_to=profile)

        date_str = request.query_params.get("date")
        if date_str:
            qs = qs.filter(scheduled_date=date_str)

        return Response({"success": True, "count": qs.count(), "results": ScheduleSerializer(qs, many=True).data})
