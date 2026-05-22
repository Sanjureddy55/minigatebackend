import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from .models import MaintenanceDue, ResidentPayment
from .serializers import MaintenanceDueSerializer, ResidentPaymentSerializer
from apps.common.utils import get_flat_id

logger = logging.getLogger(__name__)


class MaintenanceDueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Maintenance dues per flat per month.

    GET    /api/resident/payments/dues/
    POST   /api/resident/payments/dues/
    GET    /api/resident/payments/dues/{id}/
    PATCH  /api/resident/payments/dues/{id}/
    DELETE /api/resident/payments/dues/{id}/
    POST   /api/resident/payments/dues/{id}/mark-paid/
    """

    serializer_class = MaintenanceDueSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["flat", "society", "status"]
    search_fields    = ["description"]
    ordering_fields  = ["month", "due_date", "amount"]
    ordering         = ["-month"]

    def get_queryset(self):
        return MaintenanceDue.objects.select_related("flat", "society").order_by("-month")

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MaintenanceDueSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": MaintenanceDueSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = MaintenanceDueSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(
            {"success": True, "message": "Maintenance due created.", "data": MaintenanceDueSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": MaintenanceDueSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = MaintenanceDueSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": MaintenanceDueSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({"success": True, "message": "Maintenance due deleted."})

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        """POST /api/resident/payments/dues/{id}/mark-paid/"""
        obj = self.get_object()
        if obj.status == MaintenanceDue.Status.PAID:
            return Response({"success": False, "message": "Already paid."}, status=status.HTTP_400_BAD_REQUEST)
        obj.status  = MaintenanceDue.Status.PAID
        obj.paid_at = timezone.now()
        obj.save(update_fields=["status", "paid_at"])
        logger.info("MAINTENANCE_DUE_PAID | id=%s flat=%s", obj.pk, obj.flat_id)
        return Response({"success": True, "message": "Marked as paid.", "data": MaintenanceDueSerializer(obj).data})


class ResidentPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Resident payment history and recording.

    GET    /api/resident/payments/history/
    POST   /api/resident/payments/history/
    GET    /api/resident/payments/history/{id}/
    PATCH  /api/resident/payments/history/{id}/
    DELETE /api/resident/payments/history/{id}/
    """

    serializer_class = ResidentPaymentSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["flat", "resident", "society", "payment_type", "payment_method"]
    search_fields    = ["description"]
    ordering_fields  = ["payment_date", "amount", "created_at"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return (
            ResidentPayment.objects
            .select_related("flat", "resident", "society", "maintenance_due", "notice")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ResidentPaymentSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ResidentPaymentSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = ResidentPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info(
            "RESIDENT_PAYMENT_CREATE | id=%s type=%s amount=%s flat=%s",
            obj.pk, obj.payment_type, obj.amount, obj.flat_id,
        )
        # If linked to a maintenance due, auto-mark it paid
        if obj.maintenance_due and obj.maintenance_due.status != MaintenanceDue.Status.PAID:
            obj.maintenance_due.status  = MaintenanceDue.Status.PAID
            obj.maintenance_due.paid_at = timezone.now()
            obj.maintenance_due.save(update_fields=["status", "paid_at"])
        return Response(
            {"success": True, "message": "Payment recorded.", "data": ResidentPaymentSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": ResidentPaymentSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = ResidentPaymentSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": ResidentPaymentSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({"success": True, "message": "Payment record deleted."})


class ResidentPaymentSummaryView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/payments/summary/?flat=<uuid>

    Returns aggregate payment KPIs for a flat:
    pending_bills, total_paid_this_month, total_paid_this_year.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        from django.db.models import Sum
        today = timezone.localdate()

        pending_bills = MaintenanceDue.objects.filter(
            flat_id=flat_id,
            status__in=[MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE],
        ).aggregate(total=Sum("amount"))["total"] or 0

        paid_this_month = ResidentPayment.objects.filter(
            flat_id=flat_id,
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        paid_this_year = ResidentPayment.objects.filter(
            flat_id=flat_id,
            payment_date__year=today.year,
        ).aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "success": True,
            "data": {
                "pending_bills":      float(pending_bills),
                "paid_this_month":    float(paid_this_month),
                "paid_this_year":     float(paid_this_year),
                "overdue_count":      MaintenanceDue.objects.filter(
                    flat_id=flat_id, status=MaintenanceDue.Status.OVERDUE).count(),
                "pending_count":      MaintenanceDue.objects.filter(
                    flat_id=flat_id, status=MaintenanceDue.Status.PENDING).count(),
            },
        })