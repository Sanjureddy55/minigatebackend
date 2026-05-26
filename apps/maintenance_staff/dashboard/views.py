import logging
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsMaintenanceStaff
from apps.maintenance_staff.assigned_tasks.models import MaintenanceTask
from apps.maintenance_staff.assigned_tasks.serializers import MaintenanceTaskSerializer

logger = logging.getLogger(__name__)


class MaintenanceDashboardView(APIView):
    """
    GET /api/maintenance-staff/dashboard/

    Returns stats + task queue for the logged-in maintenance staff member.
    """
    permission_classes = [IsMaintenanceStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        profile = request.user.profile
        role_slug = getattr(getattr(profile, "role", None), "slug", "")

        base_qs = MaintenanceTask.objects.filter(society_id=society_id)
        if role_slug == "maintenance-staff":
            my_qs = base_qs.filter(assignee=profile)
        else:
            my_qs = base_qs

        today = timezone.localdate()
        week_start = today - timezone.timedelta(days=today.weekday())

        open_count       = my_qs.filter(status=MaintenanceTask.Status.OPEN).count()
        in_progress_count= my_qs.filter(status=MaintenanceTask.Status.IN_PROGRESS).count()
        done_this_week   = my_qs.filter(
            status__in=[MaintenanceTask.Status.DONE, MaintenanceTask.Status.CLOSED],
            completed_at__date__gte=week_start,
        ).count()

        task_queue = (
            my_qs
            .filter(status__in=[MaintenanceTask.Status.OPEN, MaintenanceTask.Status.IN_PROGRESS])
            .select_related("assignee", "created_by")
            .order_by("priority", "-created_at")[:10]
        )

        recently_completed = (
            my_qs
            .filter(status__in=[MaintenanceTask.Status.DONE, MaintenanceTask.Status.CLOSED])
            .select_related("assignee", "created_by")
            .order_by("-completed_at")[:5]
        )

        logger.info("MAINTENANCE_DASH | society=%s by=%s", society_id, request.user.pk)
        return Response({
            "success": True,
            "data": {
                "stats": {
                    "open":          open_count,
                    "in_progress":   in_progress_count,
                    "done_this_week": done_this_week,
                },
                "my_task_queue":       MaintenanceTaskSerializer(task_queue, many=True).data,
                "recently_completed":  MaintenanceTaskSerializer(recently_completed, many=True).data,
            },
        })
