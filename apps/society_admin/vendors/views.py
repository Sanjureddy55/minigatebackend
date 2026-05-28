import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society

from .models import Vendor
from .serializers import VendorKPISerializer, VendorSerializer

logger = logging.getLogger(__name__)


def _admin_society(request):
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


class VendorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Vendor Management — society-scoped CRUD.

    GET    /api/society-admin/vendors/          List all vendors
    POST   /api/society-admin/vendors/          Add vendor
    GET    /api/society-admin/vendors/{id}/     Retrieve vendor
    PATCH  /api/society-admin/vendors/{id}/     Update vendor
    DELETE /api/society-admin/vendors/{id}/     Remove vendor
    GET    /api/society-admin/vendors/kpi/      Dashboard stats
    """

    serializer_class  = VendorSerializer
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["category", "status"]    # 'society' removed — auto-scoped
    search_fields     = ["name", "contact_name", "contact_phone", "contact_email"]
    ordering_fields   = ["name", "category", "contract_end", "created_at"]
    ordering          = ["name"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            Vendor.objects
            .filter(society=society)
            .select_related("society")
            .order_by("name")
        )

    def perform_create(self, serializer):
        society = _admin_society(self.request)
        vendor  = serializer.save(society=society)
        logger.info(
            "VENDOR_CREATE | vendor=%s category=%s society=%s by=%s",
            vendor.pk, vendor.category, society.pk, self.request.user,
        )

    def perform_update(self, serializer):
        vendor = serializer.save()
        logger.info("VENDOR_UPDATE | vendor=%s by=%s", vendor.pk, self.request.user)

    def perform_destroy(self, instance):
        logger.warning("VENDOR_DELETE | vendor=%s by=%s", instance.pk, self.request.user)
        instance.delete()

    # ── KPI Dashboard (3 stat cards: Total, Active, Pending Renewal) ──────────

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        """
        GET /api/society-admin/vendors/kpi/
        No params needed — auto-scoped to the admin's own society.
        """
        society = _admin_society(request)
        agg = Vendor.objects.filter(society=society).aggregate(
            total           = Count("id"),
            active          = Count("id", filter=Q(status=Vendor.Status.ACTIVE)),
            pending_renewal = Count("id", filter=Q(status=Vendor.Status.PENDING_RENEWAL)),
            inactive        = Count("id", filter=Q(status=Vendor.Status.INACTIVE)),
        )
        return Response({"success": True, "data": VendorKPISerializer(agg).data})
