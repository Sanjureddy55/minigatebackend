import logging
from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue, ResidentPayment
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense

from .serializers import FinancialReportSerializer

logger = logging.getLogger(__name__)


def _society_id(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class FinancialReportsView(APIView):
    """
    GET /api/accountant/financial-reports/

    Query params:
      ?year=2026           — filter to specific year (default: current year)
      ?months=12           — rolling window in months (1-24, default 12)

    Returns:
      period               — human-readable period label
      total_collected      — sum of paid dues in period
      total_expenses       — sum of maintenance expenses in period
      net_balance          — collected - expenses
      dues stats           — generated / paid / pending / overdue counts
      collection_rate_pct  — paid / generated * 100
      by_payment_type      — breakdown per payment type
      by_payment_method    — breakdown per payment method
      monthly_trend        — per-month row (collected, expenses, net, paid_dues, defaulters)
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _society_id(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        today = timezone.localdate()

        # Determine period
        try:
            months = max(1, min(24, int(request.query_params.get("months", 12))))
        except (ValueError, TypeError):
            months = 12

        # Compute start of window
        total = today.year * 12 + today.month - 1 - (months - 1)
        start_year  = total // 12
        start_month = total % 12 + 1
        period_start = date(start_year, start_month, 1)

        period_label = f"{period_start.strftime('%b %Y')} – {today.strftime('%b %Y')}"

        # ── Collections ─────────────────────────────────────────────────────
        dues_qs = MaintenanceDue.objects.filter(
            society_id=sid,
            month__gte=period_start,
        )
        dues_agg = dues_qs.aggregate(
            total_collected = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
            paid_count      = Count("id",   filter=Q(status=MaintenanceDue.Status.PAID)),
            pending_count   = Count("id",   filter=Q(status=MaintenanceDue.Status.PENDING)),
            overdue_count   = Count("id",   filter=Q(status=MaintenanceDue.Status.OVERDUE)),
            total_count     = Count("id"),
        )

        total_collected  = float(dues_agg["total_collected"] or 0)
        total_generated  = dues_agg["total_count"]   or 0
        total_paid       = dues_agg["paid_count"]     or 0
        total_pending    = dues_agg["pending_count"]  or 0
        total_overdue    = dues_agg["overdue_count"]  or 0
        collection_rate  = round(total_paid / total_generated * 100, 1) if total_generated > 0 else 0.0

        # ── Expenses ─────────────────────────────────────────────────────────
        total_expenses = float(
            MaintenanceExpense.objects
            .filter(society_id=sid, expense_date__gte=period_start)
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        # ── By payment type ──────────────────────────────────────────────────
        by_type = list(
            ResidentPayment.objects
            .filter(society_id=sid, payment_date__gte=period_start)
            .values("payment_type")
            .annotate(count=Count("id"), total=Sum("amount"))
            .order_by("-total")
        )
        for r in by_type:
            r["total"] = float(r["total"] or 0)

        # ── By payment method ────────────────────────────────────────────────
        by_method = list(
            ResidentPayment.objects
            .filter(society_id=sid, payment_date__gte=period_start)
            .values("payment_method")
            .annotate(count=Count("id"), total=Sum("amount"))
            .order_by("-total")
        )
        for r in by_method:
            r["total"] = float(r["total"] or 0)

        # ── Monthly trend ────────────────────────────────────────────────────
        monthly_trend = []
        for i in range(months - 1, -1, -1):
            t = today.year * 12 + today.month - 1 - i
            y = t // 12
            m = t % 12 + 1

            row_dues = dues_qs.filter(month__year=y, month__month=m).aggregate(
                col  = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
                paid = Count("id",   filter=Q(status=MaintenanceDue.Status.PAID)),
                defs = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
            )
            row_exp = float(
                MaintenanceExpense.objects
                .filter(society_id=sid, expense_date__year=y, expense_date__month=m)
                .aggregate(total=Sum("amount"))["total"] or 0
            )
            c = float(row_dues["col"] or 0)
            monthly_trend.append({
                "month":     date(y, m, 1).strftime("%b %Y"),
                "collected": c,
                "expenses":  row_exp,
                "net":       round(c - row_exp, 2),
                "paid_dues": row_dues["paid"] or 0,
                "defaulters": row_dues["defs"] or 0,
            })

        payload = {
            "period":               period_label,
            "total_collected":      total_collected,
            "total_expenses":       total_expenses,
            "net_balance":          round(total_collected - total_expenses, 2),
            "total_dues_generated": total_generated,
            "total_dues_paid":      total_paid,
            "total_dues_pending":   total_pending,
            "total_dues_overdue":   total_overdue,
            "collection_rate_pct":  collection_rate,
            "by_payment_type":      by_type,
            "by_payment_method":    by_method,
            "monthly_trend":        monthly_trend,
        }

        logger.info("FINANCIAL_REPORT | society=%s period=%s months=%d", sid, period_label, months)
        return Response({"success": True, "data": FinancialReportSerializer(payload).data})
