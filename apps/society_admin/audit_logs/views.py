import csv
import logging

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from .models import SocietyAuditLog
from .serializers import SocietyAuditLogSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class _AuditPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class SocietyAuditLogListView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/audit-logs/?society=<id>

    Query params:
      ?society=<id>        required — scope logs to this society
      ?search=             search actor_name, action, target
      ?action_type=        approve | reject | check_in | check_out |
                           complaint | resolve | assign | publish |
                           create | update | delete | payment | system
      ?actor_role=         filter by actor role (Admin, Guard, Resident…)
      ?page=               pagination
      ?page_size=          default 20, max 100
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        qs = (
            SocietyAuditLog.objects
            .filter(society_id=society_id)
            .select_related("actor")
            .order_by("-created_at")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(actor_name__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
                | Q(actor_role__icontains=search)
            )

        action_type = request.query_params.get("action_type", "").strip()
        if action_type:
            qs = qs.filter(action_type=action_type)

        actor_role = request.query_params.get("actor_role", "").strip()
        if actor_role:
            qs = qs.filter(actor_role__icontains=actor_role)

        paginator = _AuditPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(
            SocietyAuditLogSerializer(page, many=True).data
        )


class SocietyAuditLogExportView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/audit-logs/export/?society=<id>
    Download audit log as CSV (Excel-friendly).
    Supports ?search= and ?action_type= filters.
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        qs = (
            SocietyAuditLog.objects
            .filter(society_id=society_id)
            .select_related("actor")
            .order_by("-created_at")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(actor_name__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
            )

        action_type = request.query_params.get("action_type", "").strip()
        if action_type:
            qs = qs.filter(action_type=action_type)

        filename = f"society_{society_id}_audit_logs_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["Actor", "Role", "Action", "Action Type", "Target", "Target Type", "Time"])
        for log in qs:
            actor_display = (
                "System" if log.actor_name == "System"
                else f"{log.actor_role} · {log.actor_name}"
            )
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