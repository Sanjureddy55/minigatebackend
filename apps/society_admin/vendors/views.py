import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsSocietyAdmin

from .models import Vendor
from .serializers import VendorKPISerializer, VendorSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class VendorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    CRUD for society vendors.

    GET  /api/society-admin/vendors/?society=<id>   — list
    POST /api/society-admin/vendors/                — create
    GET  /api/society-admin/vendors/<id>/           — retrieve
    PUT  /api/society-admin/vendors/<id>/           — update
    DELETE /api/society-admin/vendors/<id>/         — delete

    GET  /api/society-admin/vendors/kpi/?society=<id>  — KPI summary
    """

    queryset          = Vendor.objects.select_related("society").order_by("name")
    serializer_class  = VendorSerializer
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["society", "category", "status"]
    search_fields     = ["name", "contact_name", "contact_phone", "contact_email"]
    ordering_fields   = ["name", "category", "contract_end", "created_at"]
    ordering          = ["name"]

    @action(detail=False, methods=["get"], url_path="kpi")
    def kpi(self, request):
        society_id = get_society_id(request)
        qs = Vendor.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        agg = qs.aggregate(
            total           = Count("id"),
            active          = Count("id", filter=Q(status=Vendor.Status.ACTIVE)),
            pending_renewal = Count("id", filter=Q(status=Vendor.Status.PENDING_RENEWAL)),
            inactive        = Count("id", filter=Q(status=Vendor.Status.INACTIVE)),
        )
        return Response({"success": True, "data": VendorKPISerializer(agg).data})