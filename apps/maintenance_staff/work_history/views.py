import logging
from django.db.models import Avg, Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsMaintenanceStaff
from apps.maintenance_staff.assigned_tasks.models import MaintenanceTask
from apps.maintenance_staff.assigned_tasks.serializers import MaintenanceTaskSerializer

logger = logging.getLogger(__name__)


class WorkHistoryView(APIView):
    """
    GET /api/maintenance-staff/work-history/

    Returns closed/done tasks with resolution details, plus KPI stats.
    """
    permission_classes = [IsMaintenanceStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        profile   = request.user.profile
        role_slug = getattr(getattr(profile, "role", None), "slug", "")

        qs = MaintenanceTask.objects.filter(
            society_id=society_id,
            status__in=[MaintenanceTask.Status.DONE, MaintenanceTask.Status.CLOSED],
        ).select_related("assignee", "created_by")

        if role_slug == "maintenance-staff":
            qs = qs.filter(assignee=profile)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(title__icontains=search)

        qs = qs.order_by("-completed_at")

        agg = qs.aggregate(
            avg_rating   = Avg("rating"),
            total_hours  = Sum("hours_logged"),
        )
        tasks_closed = qs.count()
        avg_rating   = round(agg["avg_rating"] or 0, 1)
        hours_logged = float(agg["total_hours"] or 0)

        logger.info("WORK_HISTORY | society=%s by=%s", society_id, request.user.pk)
        return Response({
            "success": True,
            "data": {
                "stats": {
                    "tasks_closed": tasks_closed,
                    "avg_rating":   avg_rating,
                    "hours_logged": hours_logged,
                },
                "results": MaintenanceTaskSerializer(qs[:50], many=True).data,
            },
        })
