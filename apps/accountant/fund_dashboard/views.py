"""
Fund Dashboard
==============
GET /api/accountant/fund-dashboard/

KPI cards:
  total_collected, total_expenses_used, remaining_balance,
  pending_dues, this_month_collection, this_month_expenses,
  usage_pct, usage_label, usage_description

Tables:
  latest_expenses  — 10 most recent published expenses
  monthly_trend    — last N months collected vs spent (?months=12)
"""

import logging
from datetime import date

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense

from .serializers import FundDashboardSerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class FundDashboardView(APIView):
    """
    GET /api/accountant/fund-dashboard/
    Query: ?months=12  (rolling trend window, 1–24)
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        today = timezone.localdate()

        try:
            months = max(1, min(24, int(request.query_params.get("months", 12))))
        except (ValueError, TypeError):
            months = 12

        # ── Collections ──────────────────────────────────────────────────────
        dues_qs = MaintenanceDue.objects.filter(society_id=sid)
        agg = dues_qs.aggregate(
            total_paid   = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
            pending_amt  = Sum("amount", filter=Q(status__in=[
                MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE,
            ])),
            month_paid   = Sum("amount", filter=Q(
                status=MaintenanceDue.Status.PAID,
                month__year=today.year, month__month=today.month,
            )),
        )
        total_collected       = float(agg["total_paid"]  or 0)
        pending_dues          = float(agg["pending_amt"] or 0)
        this_month_collection = float(agg["month_paid"]  or 0)

        # ── Expenses ─────────────────────────────────────────────────────────
        exp_qs = MaintenanceExpense.objects.filter(society_id=sid)
        exp_agg = exp_qs.aggregate(
            total_exp  = Sum("amount"),
            month_exp  = Sum("amount", filter=Q(
                expense_date__year=today.year, expense_date__month=today.month,
            )),
        )
        total_expenses_used = float(exp_agg["total_exp"] or 0)
        this_month_expenses = float(exp_agg["month_exp"] or 0)

        remaining_balance = total_collected - total_expenses_used
        usage_pct = round(total_expenses_used / total_collected * 100, 1) if total_collected > 0 else 0.0

        # ── Latest published expenses ─────────────────────────────────────────
        latest_qs = (
            exp_qs.select_related("created_by")
            .filter(is_published=True)
            .order_by("-expense_date", "-created_at")[:10]
        )
        latest_expenses = [
            {
                "id":                e.pk,
                "title":             e.title,
                "category":          e.category,
                "category_display":  e.get_category_display(),
                "amount":            float(e.amount),
                "vendor_name":       e.vendor_name,
                "payment_mode":      e.payment_mode,
                "invoice_number":    e.invoice_number,
                "building_area":     e.building_area,
                "proof_url":         e.proof_url,
                "has_proof":         bool(e.proof_url and e.proof_url.strip()),
                "expense_date":      e.expense_date,
                "is_published":      e.is_published,
                "status_display":    "Published" if e.is_published else "Draft",
                "visibility_display": "Visible" if e.is_published else "Hidden",
            }
            for e in latest_qs
        ]

        # ── Monthly trend ─────────────────────────────────────────────────────
        monthly_trend = []
        for i in range(months - 1, -1, -1):
            t = today.year * 12 + today.month - 1 - i
            y = t // 12
            m = t % 12 + 1
            c = float(
                dues_qs.filter(month__year=y, month__month=m, status=MaintenanceDue.Status.PAID)
                .aggregate(s=Sum("amount"))["s"] or 0
            )
            e = float(
                exp_qs.filter(expense_date__year=y, expense_date__month=m)
                .aggregate(s=Sum("amount"))["s"] or 0
            )
            monthly_trend.append({
                "month":     date(y, m, 1).strftime("%b %Y"),
                "collected": c,
                "expenses":  e,
                "net":       round(c - e, 2),
            })

        payload = {
            "kpi": {
                "total_collected":       total_collected,
                "total_expenses_used":   total_expenses_used,
                "remaining_balance":     remaining_balance,
                "pending_dues":          pending_dues,
                "this_month_collection": this_month_collection,
                "this_month_expenses":   this_month_expenses,
                "usage_pct":             usage_pct,
                "usage_label":           f"{usage_pct}% used",
                "usage_description":     (
                    f"Rs.{total_expenses_used:,.0f} used from "
                    f"Rs.{total_collected:,.0f} collected."
                ),
            },
            "latest_expenses": latest_expenses,
            "monthly_trend":   monthly_trend,
        }

        logger.info(
            "ACCT_FUND_DASHBOARD | society=%s collected=%.0f expenses=%.0f balance=%.0f",
            sid, total_collected, total_expenses_used, remaining_balance,
        )
        return Response({"success": True, "data": FundDashboardSerializer(payload).data})
