import logging
from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue

from .serializers import BillingDashboardSerializer

logger = logging.getLogger(__name__)


def _get_accountant_society(request):
    """Return the society_id hard-scoped to the accountant's profile."""
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class AccountantBillingDashboardView(APIView):
    """
    GET /api/accountant/dashboard/

    Returns:
      collected_this_month  — sum of PAID dues this calendar month
      outstanding           — sum of PENDING + OVERDUE dues (all time)
      defaulters            — distinct flats with OVERDUE dues
      avg_collection_pct    — collected / (collected + outstanding) * 100
      monthly_history       — last 12 months KPI rows
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        society_id = _get_accountant_society(request)
        if not society_id:
            return Response({"success": False, "message": "Accountant profile has no linked society."}, status=400)

        today = timezone.localdate()

        dues_qs = MaintenanceDue.objects.filter(society_id=society_id)

        # ── Current month KPIs ──────────────────────────────────────────────
        agg = dues_qs.aggregate(
            collected   = Sum("amount", filter=Q(
                status=MaintenanceDue.Status.PAID,
                month__year=today.year,
                month__month=today.month,
            )),
            outstanding = Sum("amount", filter=Q(status__in=[
                MaintenanceDue.Status.PENDING,
                MaintenanceDue.Status.OVERDUE,
            ])),
            defaulters  = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
        )

        collected   = float(agg["collected"]   or 0)
        outstanding = float(agg["outstanding"] or 0)
        defaulters  = agg["defaulters"] or 0
        total       = collected + outstanding
        avg_pct     = round(collected / total * 100, 1) if total > 0 else 0.0

        # ── Monthly history (last 12 months) ────────────────────────────────
        history = []
        for i in range(11, -1, -1):
            # compute year/month i months back
            total_months = today.year * 12 + today.month - 1 - i
            y = total_months // 12
            m = total_months % 12 + 1
            month_start = date(y, m, 1)
            row_agg = dues_qs.filter(month__year=y, month__month=m).aggregate(
                col  = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
                out  = Sum("amount", filter=Q(status__in=[
                    MaintenanceDue.Status.PENDING,
                    MaintenanceDue.Status.OVERDUE,
                ])),
                defs = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
            )
            c = float(row_agg["col"]  or 0)
            o = float(row_agg["out"]  or 0)
            t = c + o
            history.append({
                "month":       month_start.strftime("%b %Y"),
                "collected":   c,
                "outstanding": o,
                "defaulters":  row_agg["defs"] or 0,
                "avg_pct":     round(c / t * 100, 1) if t > 0 else 0.0,
            })

        payload = {
            "collected_this_month": collected,
            "outstanding":          outstanding,
            "defaulters":           defaulters,
            "avg_collection_pct":   avg_pct,
            "monthly_history":      history,
        }

        logger.info(
            "ACCOUNTANT_DASHBOARD | society=%s collected=%.0f outstanding=%.0f defaulters=%d avg=%.1f%%",
            society_id, collected, outstanding, defaulters, avg_pct,
        )
        return Response({"success": True, "data": BillingDashboardSerializer(payload).data})
