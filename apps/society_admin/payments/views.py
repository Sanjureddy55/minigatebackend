import logging

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.resident.payments.models import MaintenanceDue
from apps.roles_permissions.models import UserProfile

from .serializers import PaymentOverviewSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


class PaymentsOverviewView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/payments/overview/?society=<id>&month=YYYY-MM

    Returns:
      collected_this_month — sum of PAID dues this month
      outstanding          — sum of PENDING + OVERDUE dues
      defaulters           — count of unique flats with overdue dues
      avg_collection_pct   — paid / (paid + outstanding) * 100
      dues                 — full due list for the month (flat, resident, amount, due_date, status)

    Query params:
      ?society=<id>   required
      ?month=YYYY-MM  optional (default: current month)
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        today = timezone.localdate()
        month_str = request.query_params.get("month")
        if month_str:
            try:
                import datetime
                year, month = month_str.split("-")
                target_year, target_month = int(year), int(month)
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)
        else:
            target_year, target_month = today.year, today.month

        dues_qs = (
            MaintenanceDue.objects
            .filter(
                society_id=society_id,
                month__year=target_year,
                month__month=target_month,
            )
            .select_related("flat", "flat__building")
        )

        agg = dues_qs.aggregate(
            collected   = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
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
        avg_pct     = round((collected / total * 100), 1) if total > 0 else 0.0

        STATUS_LABELS = {
            MaintenanceDue.Status.PENDING:  "Pending",
            MaintenanceDue.Status.PAID:     "Paid",
            MaintenanceDue.Status.OVERDUE:  "Overdue",
        }

        # Build flat_number → resident name map for this society
        resident_map = {
            up["flat_number"]: up["full_name"]
            for up in UserProfile.objects.filter(
                society_id=society_id, status=UserProfile.Status.ACTIVE
            ).values("flat_number", "full_name")
            if up["flat_number"]
        }

        dues_list = []
        for due in dues_qs.order_by("flat__building__name", "flat__flat_number"):
            flat_num = due.flat.flat_number if due.flat else ""
            dues_list.append({
                "flat_number":    flat_num,
                "building":       due.flat.building.name if due.flat and due.flat.building_id else "",
                "resident":       resident_map.get(flat_num, ""),
                "amount":         float(due.amount),
                "due_date":       due.due_date,
                "status":         due.status,
                "status_display": STATUS_LABELS.get(due.status, due.status.title()),
            })

        data = {
            "collected_this_month": collected,
            "outstanding":          outstanding,
            "defaulters":           defaulters,
            "avg_collection_pct":   avg_pct,
            "dues":                 dues_list,
        }

        logger.info(
            "PAYMENTS_OVERVIEW | society=%s month=%s-%s collected=%.0f outstanding=%.0f",
            society_id, target_year, target_month, collected, outstanding,
        )
        return Response({"success": True, "data": PaymentOverviewSerializer(data).data})