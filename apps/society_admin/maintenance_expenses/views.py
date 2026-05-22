import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsSocietyAdmin

from .models import MaintenanceExpense
from .serializers import MaintenanceExpenseSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class MaintenanceExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Society Admin — record and publish maintenance expenses.

    GET    /api/society-admin/maintenance-expenses/
    POST   /api/society-admin/maintenance-expenses/
    GET    /api/society-admin/maintenance-expenses/{id}/
    PUT    /api/society-admin/maintenance-expenses/{id}/
    PATCH  /api/society-admin/maintenance-expenses/{id}/
    DELETE /api/society-admin/maintenance-expenses/{id}/
    POST   /api/society-admin/maintenance-expenses/{id}/publish/
    POST   /api/society-admin/maintenance-expenses/{id}/unpublish/
    GET    /api/society-admin/maintenance-expenses/summary/?society=<id>
    """

    serializer_class = MaintenanceExpenseSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "category", "is_published"]
    search_fields    = ["title", "vendor_name", "notes"]
    ordering_fields  = ["expense_date", "amount", "created_at"]
    ordering         = ["-expense_date"]

    def get_queryset(self):
        return (
            MaintenanceExpense.objects
            .select_related("society", "created_by")
            .order_by("-expense_date")
        )

    def list(self, request, *args, **kwargs):
        logger.info("EXPENSE_LIST | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MaintenanceExpenseSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": MaintenanceExpenseSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = MaintenanceExpenseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("EXPENSE_CREATE | id=%s title='%s' amount=%s society=%s", obj.pk, obj.title, obj.amount, obj.society_id)
        return Response(
            {"success": True, "message": "Expense recorded.", "data": MaintenanceExpenseSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": MaintenanceExpenseSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = MaintenanceExpenseSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("EXPENSE_UPDATE | id=%s", obj.pk)
        return Response({"success": True, "data": MaintenanceExpenseSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.warning("EXPENSE_DELETE | id=%s title='%s'", obj.pk, obj.title)
        return Response({"success": True, "message": "Expense deleted."})

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        """POST /api/society-admin/maintenance-expenses/{id}/publish/"""
        obj = self.get_object()
        obj.is_published = True
        obj.save(update_fields=["is_published", "updated_at"])
        logger.info("EXPENSE_PUBLISH | id=%s title='%s'", obj.pk, obj.title)
        return Response({"success": True, "message": "Expense published to residents.", "data": MaintenanceExpenseSerializer(obj).data})

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, pk=None):
        """POST /api/society-admin/maintenance-expenses/{id}/unpublish/"""
        obj = self.get_object()
        obj.is_published = False
        obj.save(update_fields=["is_published", "updated_at"])
        return Response({"success": True, "message": "Expense unpublished.", "data": MaintenanceExpenseSerializer(obj).data})

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        GET /api/society-admin/maintenance-expenses/summary/?society=<id>

        Returns: total_expenses, total_published, amount_used, by_category breakdown.
        """
        from django.db.models import Count, Sum

        qs = self.get_queryset()
        society_id = get_society_id(request)
        if society_id:
            qs = qs.filter(society_id=society_id)

        total_amount = qs.aggregate(total=Sum("amount"))["total"] or 0
        by_category  = list(
            qs.values("category").annotate(total=Sum("amount"), count=Count("id")).order_by("-total")
        )

        return Response({
            "success": True,
            "data": {
                "total_expenses":   qs.count(),
                "total_published":  qs.filter(is_published=True).count(),
                "amount_used":      float(total_amount),
                "by_category":      by_category,
            },
        })