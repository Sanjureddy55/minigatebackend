import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsSocietyAdmin

from .models import StaffMember
from .serializers import StaffKPISerializer, StaffMemberSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class StaffMemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    CRUD for society staff members.

    GET  /api/society-admin/staff-guards/?society=<id>   — list
    POST /api/society-admin/staff-guards/                — create
    GET  /api/society-admin/staff-guards/<id>/           — retrieve
    PUT  /api/society-admin/staff-guards/<id>/           — full update
    PATCH /api/society-admin/staff-guards/<id>/          — partial update
    DELETE /api/society-admin/staff-guards/<id>/         — delete

    GET  /api/society-admin/staff-guards/kpi/?society=<id>  — KPI summary
    """

    queryset          = StaffMember.objects.select_related("society").order_by("role", "full_name")
    serializer_class  = StaffMemberSerializer
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["society", "role", "shift", "status"]
    search_fields     = ["full_name", "phone", "email", "gate_assigned"]
    ordering_fields   = ["full_name", "role", "joined_date", "created_at"]
    ordering          = ["role", "full_name"]

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        society_id = get_society_id(request)
        qs = StaffMember.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        agg = qs.aggregate(
            total    = Count("id"),
            guards   = Count("id", filter=Q(role=StaffMember.Role.SECURITY_GUARD)),
            hk       = Count("id", filter=Q(role=StaffMember.Role.HOUSEKEEPING)),
            maint    = Count("id", filter=Q(role=StaffMember.Role.MAINTENANCE)),
            on_leave = Count("id", filter=Q(status=StaffMember.Status.ON_LEAVE)),
        )
        data = {
            "total_staff":  agg["total"],
            "guards":       agg["guards"],
            "housekeeping": agg["hk"],
            "maintenance":  agg["maint"],
            "on_leave":     agg["on_leave"],
        }
        return Response({"success": True, "data": StaffKPISerializer(data).data})