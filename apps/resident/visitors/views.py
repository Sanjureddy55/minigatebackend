import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from apps.society_admin.visitors.models import Visitor
from apps.society_admin.visitors.serializers import VisitorSerializer

from .models import GuestPass
from .serializers import GuestPassSerializer
from apps.common.utils import get_flat_id

logger = logging.getLogger(__name__)


class GuestPassViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Resident — Invite Guest (create a timed access pass with QR code).

    GET    /api/resident/visitors/passes/
    POST   /api/resident/visitors/passes/
    GET    /api/resident/visitors/passes/{id}/
    PATCH  /api/resident/visitors/passes/{id}/
    DELETE /api/resident/visitors/passes/{id}/
    POST   /api/resident/visitors/passes/{id}/cancel/
    """

    serializer_class = GuestPassSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["flat", "created_by", "visit_type", "status"]
    search_fields    = ["full_name", "mobile", "vehicle_number"]
    ordering_fields  = ["visit_date", "created_at"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return GuestPass.objects.select_related("flat", "created_by").order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(GuestPassSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": GuestPassSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = GuestPassSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info(
            "GUEST_PASS_CREATE | id=%s flat=%s visitor='%s' qr=%s",
            obj.pk, obj.flat_id, obj.full_name, obj.qr_code,
        )
        return Response(
            {"success": True, "message": "Guest pass created.", "data": GuestPassSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": GuestPassSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        if instance.status != GuestPass.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Only active passes can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = GuestPassSerializer(instance, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": GuestPassSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({"success": True, "message": "Guest pass deleted."})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """POST /api/resident/visitors/passes/{id}/cancel/"""
        obj = self.get_object()
        if obj.status != GuestPass.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Only active passes can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.status = GuestPass.Status.CANCELLED
        obj.save(update_fields=["status", "updated_at"])
        logger.info("GUEST_PASS_CANCEL | id=%s", obj.pk)
        return Response({"success": True, "message": "Guest pass cancelled.", "data": GuestPassSerializer(obj).data})


class ResidentVisitorApprovalView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/approvals/?flat=<uuid>

    Pending + approved-today visitors for a resident's flat.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        today = timezone.localdate()
        qs    = Visitor.objects.filter(flat_id=flat_id).select_related("flat", "approved_by")

        awaiting       = qs.filter(status=Visitor.Status.PENDING)
        approved_today = qs.filter(status=Visitor.Status.APPROVED, created_at__date=today)

        return Response({
            "success": True,
            "data": {
                "awaiting_count":       awaiting.count(),
                "approved_today_count": approved_today.count(),
                "awaiting":             VisitorSerializer(awaiting.order_by("-created_at"), many=True).data,
                "approved_today":       VisitorSerializer(approved_today.order_by("-created_at"), many=True).data,
            },
        })


class ResidentDeliveryApprovalView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/deliveries/?flat=<uuid>

    Delivery-type visitors for a flat, split by pending / completed.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        qs = (
            Visitor.objects
            .filter(flat_id=flat_id, visit_type=Visitor.VisitType.DELIVERY)
            .select_related("flat", "approved_by")
            .order_by("-created_at")
        )
        pending   = qs.filter(status=Visitor.Status.PENDING)
        completed = qs.exclude(status=Visitor.Status.PENDING)

        return Response({
            "success": True,
            "data": {
                "pending_count":   pending.count(),
                "completed_count": completed.count(),
                "pending":         VisitorSerializer(pending, many=True).data,
                "completed":       VisitorSerializer(completed[:20], many=True).data,
            },
        })


class ResidentEntryExitHistoryView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/history/?flat=<uuid>&page_size=20

    All processed visitors for the flat ordered by most recent activity.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        qs = (
            Visitor.objects
            .filter(flat_id=flat_id)
            .exclude(status=Visitor.Status.PENDING)
            .select_related("flat", "approved_by")
            .order_by("-created_at")
        )
        paginator           = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 20))
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(VisitorSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": VisitorSerializer(qs, many=True).data})