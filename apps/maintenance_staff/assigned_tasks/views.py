import logging

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.common.permissions import IsMaintenanceStaff

from .models import MaintenanceTask
from .serializers import MaintenanceTaskSerializer, MaintenanceTaskCreateSerializer

logger = logging.getLogger(__name__)


class TaskPagination(PageNumberPagination):
    page_size             = 25
    page_size_query_param = "page_size"
    max_page_size         = 100


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class MaintenanceTaskViewSet(viewsets.ViewSet):
    """
    GET    /api/maintenance-staff/assigned-tasks/          — list tasks for logged-in staff
    POST   /api/maintenance-staff/assigned-tasks/          — create task (society admin)
    GET    /api/maintenance-staff/assigned-tasks/<id>/     — retrieve
    PATCH  /api/maintenance-staff/assigned-tasks/<id>/start/    — mark in_progress
    PATCH  /api/maintenance-staff/assigned-tasks/<id>/complete/ — mark done
    """
    permission_classes = [IsMaintenanceStaff]

    def list(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            MaintenanceTask.objects
            .filter(society_id=society_id)
            .select_related("assignee", "created_by")
            .order_by("-created_at")
        )

        # Maintenance staff sees only their own tasks; society admin/super admin sees all
        role = getattr(getattr(request.user, "profile", None), "role", None)
        slug = getattr(role, "slug", "")
        if slug == "maintenance-staff":
            qs = qs.filter(assignee=request.user.profile)

        status_filter   = request.query_params.get("status")
        priority_filter = request.query_params.get("priority")
        search          = request.query_params.get("search", "").strip()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if search:
            qs = qs.filter(title__icontains=search)

        paginator = TaskPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(MaintenanceTaskSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": MaintenanceTaskSerializer(qs, many=True).data})

    def create(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)
        ser = MaintenanceTaskCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = ser.save(society_id=society_id, created_by=request.user.profile)
        return Response(
            {"success": True, "message": "Task created.", "data": MaintenanceTaskSerializer(task).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        society_id = _sid(request)
        try:
            task = MaintenanceTask.objects.select_related("assignee", "created_by").get(
                pk=pk, society_id=society_id
            )
        except MaintenanceTask.DoesNotExist:
            return Response({"success": False, "message": "Task not found."}, status=404)
        return Response({"success": True, "data": MaintenanceTaskSerializer(task).data})

    @action(detail=True, methods=["patch"], url_path="start")
    def start(self, request, pk=None):
        society_id = _sid(request)
        try:
            task = MaintenanceTask.objects.get(pk=pk, society_id=society_id)
        except MaintenanceTask.DoesNotExist:
            return Response({"success": False, "message": "Task not found."}, status=404)
        if task.status != MaintenanceTask.Status.OPEN:
            return Response({"success": False, "message": "Only OPEN tasks can be started."}, status=400)
        task.status     = MaintenanceTask.Status.IN_PROGRESS
        task.started_at = timezone.now()
        task.save(update_fields=["status", "started_at", "updated_at"])
        logger.info("TASK_START | task=%s by=%s", task.pk, request.user.pk)
        return Response({"success": True, "data": MaintenanceTaskSerializer(task).data})

    @action(detail=True, methods=["patch"], url_path="complete")
    def complete(self, request, pk=None):
        society_id = _sid(request)
        try:
            task = MaintenanceTask.objects.get(pk=pk, society_id=society_id)
        except MaintenanceTask.DoesNotExist:
            return Response({"success": False, "message": "Task not found."}, status=404)
        if task.status not in (MaintenanceTask.Status.OPEN, MaintenanceTask.Status.IN_PROGRESS):
            return Response({"success": False, "message": "Task is already done or closed."}, status=400)
        notes        = request.data.get("resolution_notes", "")
        hours        = request.data.get("hours_logged")
        task.status           = MaintenanceTask.Status.DONE
        task.completed_at     = timezone.now()
        task.resolution_notes = notes
        if hours:
            task.hours_logged = hours
        task.save(update_fields=["status", "completed_at", "resolution_notes", "hours_logged", "updated_at"])
        logger.info("TASK_COMPLETE | task=%s by=%s", task.pk, request.user.pk)
        return Response({"success": True, "data": MaintenanceTaskSerializer(task).data})
