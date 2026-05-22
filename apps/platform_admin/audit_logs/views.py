import csv

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSuperAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class _AuditLogPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class AuditLogListView(APIView):
    """
    GET /api/platform-admin/audit-logs/
        ?search=       — actor_name, action, target
        ?action_type=  — create | update | delete | approve | suspend | activate | invite | system
        ?page=         — pagination
        ?page_size=    — default 20, max 100
    """
    permission_classes = [IsSuperAdmin]

    pagination_class = _AuditLogPagination

    def get(self, request):
        qs = AuditLog.objects.select_related("actor").order_by("-created_at")

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(actor_name__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
            )

        action_type = request.query_params.get("action_type", "").strip()
        if action_type:
            qs = qs.filter(action_type=action_type)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AuditLogExportView(APIView):
    """GET /api/platform-admin/audit-logs/export/ — Download as CSV."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = AuditLog.objects.select_related("actor").order_by("-created_at")

        action_type = request.query_params.get("action_type", "").strip()
        if action_type:
            qs = qs.filter(action_type=action_type)

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(actor_name__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
            )

        response = HttpResponse(content_type="text/csv")
        filename = f"audit_logs_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["Actor", "Role", "Action", "Action Type", "Target", "Target Type", "Time"])
        for log in qs:
            actor_display = "System" if log.actor_name == "System" else f"{log.actor_role} · {log.actor_name}"
            writer.writerow([
                actor_display,
                log.actor_role,
                log.action,
                log.action_type,
                log.target,
                log.target_type,
                log.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            ])
        return response