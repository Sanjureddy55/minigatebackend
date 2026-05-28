import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society

from .models import StaffMember
from .serializers import StaffKPISerializer, StaffMemberSerializer

logger = logging.getLogger(__name__)


def _admin_society(request):
    """Returns the Society for the logged-in admin. Raises 403 if not linked."""
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


class StaffMemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Staff & Guard Management — society-scoped CRUD.

    GET    /api/society-admin/staff-guards/           List all staff
    POST   /api/society-admin/staff-guards/           Add staff member
    GET    /api/society-admin/staff-guards/{id}/      Retrieve staff
    PATCH  /api/society-admin/staff-guards/{id}/      Update staff
    DELETE /api/society-admin/staff-guards/{id}/      Remove staff
    GET    /api/society-admin/staff-guards/kpi/       Dashboard stats
    """

    serializer_class  = StaffMemberSerializer
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["role", "shift", "status"]   # 'society' removed — auto-scoped
    search_fields     = ["full_name", "phone", "email", "gate_assigned"]
    ordering_fields   = ["full_name", "role", "joined_date", "created_at"]
    ordering          = ["role", "full_name"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            StaffMember.objects
            .filter(society=society)
            .select_related("society")
            .order_by("role", "full_name")
        )

    def perform_create(self, serializer):
        society = _admin_society(self.request)
        staff   = serializer.save(society=society)
        logger.info(
            "STAFF_CREATE | staff=%s role=%s society=%s by=%s",
            staff.pk, staff.role, society.pk, self.request.user,
        )

    def perform_update(self, serializer):
        staff = serializer.save()
        logger.info("STAFF_UPDATE | staff=%s by=%s", staff.pk, self.request.user)

    def perform_destroy(self, instance):
        logger.warning("STAFF_DELETE | staff=%s by=%s", instance.pk, self.request.user)
        instance.delete()

    # ── KPI Dashboard (3 stat cards: Total Staff, Guards, Housekeeping) ───────

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        """
        GET /api/society-admin/staff-guards/kpi/
        No params needed — auto-scoped to the admin's own society.
        """
        society = _admin_society(request)
        qs = StaffMember.objects.filter(society=society)

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
