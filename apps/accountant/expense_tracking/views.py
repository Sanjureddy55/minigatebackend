import logging

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense

from .serializers import ExpenseSerializer

logger = logging.getLogger(__name__)


def _society_id(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class ExpenseTrackingViewSet(ViewSet):
    """
    GET    /api/accountant/expense-tracking/           List expenses
    POST   /api/accountant/expense-tracking/           Create expense
    GET    /api/accountant/expense-tracking/{id}/      Retrieve
    PATCH  /api/accountant/expense-tracking/{id}/      Update
    DELETE /api/accountant/expense-tracking/{id}/      Delete
    POST   /api/accountant/expense-tracking/{id}/publish/    Publish
    POST   /api/accountant/expense-tracking/{id}/unpublish/  Unpublish
    GET    /api/accountant/expense-tracking/summary/   Category breakdown
    """
    permission_classes = [IsAccountant]
    pagination_class   = _Pagination

    def _qs(self, sid):
        return (
            MaintenanceExpense.objects
            .filter(society_id=sid)
            .select_related("created_by")
            .order_by("-expense_date")
        )

    def list(self, request):
        sid = _society_id(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = self._qs(sid)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        published = request.query_params.get("is_published")
        if published is not None:
            qs = qs.filter(is_published=published.lower() == "true")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        data = ExpenseSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    def create(self, request):
        sid = _society_id(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        ser = ExpenseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(society_id=sid, created_by=request.user.profile)

        logger.info("ACCT_EXPENSE_CREATE | id=%s title='%s' amount=%s society=%s by=%s",
                    obj.pk, obj.title, obj.amount, sid, request.user)
        return Response(
            {"success": True, "message": "Expense recorded.", "data": ExpenseSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        sid = _society_id(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({"success": True, "data": ExpenseSerializer(obj).data})

    def partial_update(self, request, pk=None):
        sid = _society_id(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        ser = ExpenseSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("ACCT_EXPENSE_UPDATE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": ExpenseSerializer(obj).data})

    def destroy(self, request, pk=None):
        sid = _society_id(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        obj.delete()
        logger.info("ACCT_EXPENSE_DELETE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "message": "Expense deleted."})

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        sid = _society_id(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        obj.is_published = True
        obj.save(update_fields=["is_published", "updated_at"])
        logger.info("ACCT_EXPENSE_PUBLISH | id=%s by=%s", pk, request.user)
        return Response({"success": True, "message": "Expense published to residents.", "data": ExpenseSerializer(obj).data})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        sid = _society_id(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        obj.is_published = False
        obj.save(update_fields=["is_published", "updated_at"])
        return Response({"success": True, "message": "Expense unpublished.", "data": ExpenseSerializer(obj).data})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """GET /summary/ — total + by-category breakdown."""
        sid = _society_id(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        from django.db.models import Count
        qs = self._qs(sid)
        total_amount = qs.aggregate(total=Sum("amount"))["total"] or 0
        by_category  = list(
            qs.values("category").annotate(total=Sum("amount"), count=Count("id")).order_by("-total")
        )
        return Response({
            "success": True,
            "data": {
                "total_expenses":  qs.count(),
                "total_published": qs.filter(is_published=True).count(),
                "amount_used":     float(total_amount),
                "by_category":     by_category,
            },
        })
