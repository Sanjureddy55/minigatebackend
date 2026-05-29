import logging

from django.db.models import Count, Q, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.resident.payments.models import MaintenanceDue

from .models import MaintenanceExpense
from .serializers import MaintenanceExpenseSerializer

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


class MaintenanceExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Add / Manage Expenses — society-scoped CRUD.

    GET    /api/society-admin/maintenance-expenses/              List all
    POST   /api/society-admin/maintenance-expenses/              Add expense
    GET    /api/society-admin/maintenance-expenses/{id}/         Retrieve
    PATCH  /api/society-admin/maintenance-expenses/{id}/         Update
    DELETE /api/society-admin/maintenance-expenses/{id}/         Delete
    POST   /api/society-admin/maintenance-expenses/{id}/publish/   Publish
    POST   /api/society-admin/maintenance-expenses/{id}/unpublish/ Unpublish
    GET    /api/society-admin/maintenance-expenses/fund-dashboard/ 6 stat cards
    """

    serializer_class = MaintenanceExpenseSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_published"]   # 'society' removed — auto-scoped
    search_fields    = ["title", "vendor_name", "notes"]
    ordering_fields  = ["expense_date", "amount", "created_at"]
    ordering         = ["-expense_date"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            MaintenanceExpense.objects
            .filter(society=society)
            .select_related("society", "created_by")
            .order_by("-expense_date")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        society = _admin_society(self.request)
        try:
            profile = self.request.user.profile
        except Exception:
            profile = None
        obj = serializer.save(society=society, created_by=profile)
        logger.info(
            "EXPENSE_CREATE | id=%s title='%s' amount=%s society=%s by=%s",
            obj.pk, obj.title, obj.amount, society.pk, self.request.user,
        )

    def create(self, request, *args, **kwargs):
        ser = MaintenanceExpenseSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        return Response(
            {"success": True, "message": "Expense recorded.", "data": ser.data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": MaintenanceExpenseSerializer(
            self.get_object(), context={"request": request}
        ).data})

    def perform_update(self, serializer):
        obj = serializer.save()
        logger.info("EXPENSE_UPDATE | id=%s by=%s", obj.pk, self.request.user)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.warning("EXPENSE_DELETE | id=%s title='%s' by=%s", obj.pk, obj.title, request.user)
        return Response({"success": True, "message": "Expense deleted."})

    # ── Publish / Unpublish ───────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        """POST /api/society-admin/maintenance-expenses/{id}/publish/"""
        obj = self.get_object()
        obj.is_published = True
        obj.save(update_fields=["is_published", "updated_at"])
        logger.info("EXPENSE_PUBLISH | id=%s by=%s", obj.pk, request.user)
        return Response({
            "success": True,
            "message": "Expense published — now visible to residents.",
            "data":    MaintenanceExpenseSerializer(obj, context={"request": request}).data,
        })

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, pk=None):
        """POST /api/society-admin/maintenance-expenses/{id}/unpublish/"""
        obj = self.get_object()
        obj.is_published = False
        obj.save(update_fields=["is_published", "updated_at"])
        logger.info("EXPENSE_UNPUBLISH | id=%s by=%s", obj.pk, request.user)
        return Response({
            "success": True,
            "message": "Expense unpublished — hidden from residents.",
            "data":    MaintenanceExpenseSerializer(obj, context={"request": request}).data,
        })

    # ── Fund Dashboard (6 stat cards + fund usage progress) ──────────────────

    @action(detail=False, methods=["get"], url_path="fund-dashboard")
    def fund_dashboard(self, request):
        """
        GET /api/society-admin/maintenance-expenses/fund-dashboard/

        Returns the 6 stat cards shown in the UI:
          Total Maintenance Collected | Total Expenses Used | Remaining Balance
          Pending Dues                | This Month Collection | This Month Expenses

        Also returns:
          fund_usage_pct      → progress bar %  (61.9% used)
          latest_expenses     → last 10 published expenses (the table)
        """
        society = _admin_society(request)
        today   = timezone.localdate()

        # ── Maintenance Dues ──
        all_dues     = MaintenanceDue.objects.filter(society=society)
        total_collected = float(
            all_dues.filter(status=MaintenanceDue.Status.PAID)
            .aggregate(s=Sum("amount"))["s"] or 0
        )
        pending_dues = float(
            all_dues.filter(status__in=[
                MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE
            ]).aggregate(s=Sum("amount"))["s"] or 0
        )
        month_collected = float(
            all_dues.filter(
                status=MaintenanceDue.Status.PAID,
                month__year=today.year, month__month=today.month,
            ).aggregate(s=Sum("amount"))["s"] or 0
        )

        # ── Maintenance Expenses ──
        all_expenses   = MaintenanceExpense.objects.filter(society=society)
        total_expenses = float(all_expenses.aggregate(s=Sum("amount"))["s"] or 0)
        month_expenses = float(
            all_expenses.filter(
                expense_date__year=today.year, expense_date__month=today.month,
            ).aggregate(s=Sum("amount"))["s"] or 0
        )

        remaining_balance = total_collected - total_expenses
        fund_usage_pct    = round((total_expenses / total_collected * 100), 1) if total_collected > 0 else 0.0

        # Latest published expenses (the table at bottom of page)
        latest = (
            all_expenses
            .filter(is_published=True)
            .order_by("-expense_date")[:10]
        )

        return Response({
            "success": True,
            "data": {
                "total_maintenance_collected": total_collected,
                "total_expenses_used":         total_expenses,
                "remaining_balance":           remaining_balance,
                "pending_dues":                pending_dues,
                "this_month_collection":       month_collected,
                "this_month_expenses":         month_expenses,
                "fund_usage_pct":              fund_usage_pct,
                "fund_usage_label":            f"{fund_usage_pct}% used",
                "latest_expenses":             MaintenanceExpenseSerializer(
                    latest, many=True, context={"request": request}
                ).data,
            },
        })
