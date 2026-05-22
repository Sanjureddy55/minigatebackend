import logging
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.resident.payments.models import MaintenanceDue
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense

from .serializers import FundDashboardSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class FundDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/fund-dashboard/?society=<id>

    Returns the complete Maintenance Fund Dashboard:
      ┌─────────────────────────────────────────────────────────┐
      │ KPI (6 cards)                                           │
      │   total_collected       — all-time paid maintenance     │
      │   total_expenses_used   — all-time recorded expenses    │
      │   remaining_balance     — collected - expenses          │
      │   pending_dues          — sum of pending + overdue dues │
      │   this_month_collection — paid dues this calendar month │
      │   this_month_expenses   — expenses this calendar month  │
      │                                                         │
      │ Fund usage progress bar                                 │
      │   usage_pct, usage_label, usage_description            │
      │                                                         │
      │ latest_expenses — published expenses (newest first)     │
      │   title | category | amount | proof_url | status       │
      └─────────────────────────────────────────────────────────┘
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response(
                {"success": False, "message": "society query param is required."},
                status=400,
            )

        today = timezone.localdate()

        # ── 1. Collections (MaintenanceDue) ─────────────────────────────────────

        dues_qs = MaintenanceDue.objects.filter(society_id=society_id)

        due_agg = dues_qs.aggregate(
            total_paid    = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
            pending_amt   = Sum("amount", filter=Q(status__in=[
                MaintenanceDue.Status.PENDING,
                MaintenanceDue.Status.OVERDUE,
            ])),
            month_paid    = Sum("amount", filter=Q(
                status=MaintenanceDue.Status.PAID,
                month__year=today.year,
                month__month=today.month,
            )),
        )

        total_collected       = due_agg["total_paid"]  or Decimal("0")
        pending_dues          = due_agg["pending_amt"] or Decimal("0")
        this_month_collection = due_agg["month_paid"]  or Decimal("0")

        # ── 2. Expenses (MaintenanceExpense) ────────────────────────────────────

        exp_qs = MaintenanceExpense.objects.filter(society_id=society_id)

        exp_agg = exp_qs.aggregate(
            total_exp    = Sum("amount"),
            month_exp    = Sum("amount", filter=Q(
                expense_date__year=today.year,
                expense_date__month=today.month,
            )),
        )

        total_expenses_used  = exp_agg["total_exp"] or Decimal("0")
        this_month_expenses  = exp_agg["month_exp"] or Decimal("0")

        # ── 3. Derived values ────────────────────────────────────────────────────

        remaining_balance = total_collected - total_expenses_used

        if total_collected > 0:
            usage_pct = round(float(total_expenses_used / total_collected * 100), 1)
        else:
            usage_pct = 0.0

        usage_label       = f"{usage_pct}% used"
        usage_description = (
            f"Rs.{total_expenses_used:,.0f} used from "
            f"Rs.{total_collected:,.0f} collected."
        )

        # ── 4. Latest published expenses (table) ────────────────────────────────

        latest_qs = (
            exp_qs
            .select_related("created_by")
            .filter(is_published=True)
            .order_by("-expense_date", "-created_at")[:10]
        )

        latest_expenses = []
        for e in latest_qs:
            latest_expenses.append({
                "id":               e.pk,
                "title":            e.title,
                "category":         e.category,
                "category_display": e.get_category_display(),
                "amount":           e.amount,
                "proof_url":        e.proof_url,
                "expense_date":     e.expense_date,
                "is_published":     e.is_published,
                "status_display":   "Published" if e.is_published else "Draft",
                "vendor_name":      e.vendor_name,
            })

        # ── 5. Compose & return ──────────────────────────────────────────────────

        payload = {
            "kpi": {
                "total_collected":       total_collected,
                "total_expenses_used":   total_expenses_used,
                "remaining_balance":     remaining_balance,
                "pending_dues":          pending_dues,
                "this_month_collection": this_month_collection,
                "this_month_expenses":   this_month_expenses,
                "usage_pct":             usage_pct,
                "usage_label":           usage_label,
                "usage_description":     usage_description,
            },
            "latest_expenses": latest_expenses,
        }

        logger.info(
            "FUND_DASHBOARD | society=%s collected=%.0f expenses=%.0f balance=%.0f usage=%.1f%%",
            society_id,
            float(total_collected),
            float(total_expenses_used),
            float(remaining_balance),
            usage_pct,
        )

        return Response({
            "success": True,
            "data":    FundDashboardSerializer(payload).data,
        })