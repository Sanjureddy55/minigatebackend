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


def _apply_category_filter(qs, category: str):
    """
    Maps UI category names → DB query.
    billing  = any action on a plan (target_type=plan)
    system   = action_type=system
    security = action_type=suspend
    admin    = everything else (create/update/delete/invite/approve/activate on society/user)
    """
    from django.db.models import Q
    if category == "billing":
        return qs.filter(target_type="plan")
    if category == "system":
        return qs.filter(action_type="system")
    if category == "security":
        return qs.filter(action_type="suspend")
    if category == "admin":
        return qs.exclude(action_type="system").exclude(action_type="suspend").exclude(target_type="plan")
    return qs


class AuditLogListView(APIView):
    """
    GET /api/platform-admin/audit-logs/
        ?search=       — actor_name, action, target
        ?action_type=  — create | update | delete | approve | suspend | activate | invite | system
        ?category=     — admin | billing | system | security  (UI-level grouping)
        ?page=         — pagination
        ?page_size=    — default 20, max 100
    """
    permission_classes = [IsSuperAdmin]

    pagination_class = _AuditLogPagination

    def get(self, request):
        base_qs = AuditLog.objects.select_related("actor").order_by("-created_at")

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            base_qs = base_qs.filter(
                Q(actor_name__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
            )

        action_type = request.query_params.get("action_type", "").strip()
        if action_type:
            base_qs = base_qs.filter(action_type=action_type)

        category = request.query_params.get("category", "").strip()
        if category:
            base_qs = _apply_category_filter(base_qs, category)

        paginator = self.pagination_class()
        page      = paginator.paginate_queryset(base_qs, request, view=self)
        serializer = AuditLogSerializer(page, many=True)
        response  = paginator.get_paginated_response(serializer.data)

        # Embed global summary totals (always counts across the full unfiltered table)
        all_logs = AuditLog.objects.all()
        response.data["summary"] = {
            "total":    all_logs.count(),
            "admin":    _apply_category_filter(all_logs, "admin").count(),
            "security": _apply_category_filter(all_logs, "security").count(),
            "system":   _apply_category_filter(all_logs, "system").count(),
            "billing":  _apply_category_filter(all_logs, "billing").count(),
        }
        return response


class AuditLogSummaryView(APIView):
    """
    GET /api/platform-admin/audit-logs/summary/
    Returns total count + per-category counts for KPI cards + filter tabs.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        base = AuditLog.objects.all()

        total    = base.count()
        admin    = _apply_category_filter(base, "admin").count()
        billing  = _apply_category_filter(base, "billing").count()
        system   = _apply_category_filter(base, "system").count()
        security = _apply_category_filter(base, "security").count()

        return Response({
            "success": True,
            "data": {
                "total":    total,
                "admin":    admin,
                "billing":  billing,
                "system":   system,
                "security": security,
            },
        })


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