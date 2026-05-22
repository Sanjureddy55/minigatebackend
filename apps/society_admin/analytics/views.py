import logging
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.resident.complaints.models import Complaint
from apps.resident.payments.models import MaintenanceDue
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense
from apps.society_admin.visitors.models import Visitor
from apps.roles_permissions.models import UserProfile
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}


class SocietyAnalyticsView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/analytics/?society=<id>&period=30d

    Comprehensive society-level analytics for the Insights panel.

    Returns:
      overview        — summary KPIs (collected, expenses, complaints, visitors)
      collection_trend — monthly maintenance collection chart
      expense_trend    — monthly expenses chart
      complaint_chart  — complaints by category + monthly trend
      visitor_chart    — visitors by type + daily trend
      occupancy        — resident count, active/inactive, flats filled
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        period  = request.query_params.get("period", "30d")
        days    = PERIOD_DAYS.get(period, 30)
        cutoff  = timezone.now() - timedelta(days=days)
        today   = timezone.localdate()

        # ── Overview KPIs ────────────────────────────────────────────────────
        total_collected = (
            MaintenanceDue.objects
            .filter(society_id=society_id, status=MaintenanceDue.Status.PAID)
            .aggregate(t=Sum("amount"))["t"] or 0
        )
        total_expenses = (
            MaintenanceExpense.objects
            .filter(society_id=society_id)
            .aggregate(t=Sum("amount"))["t"] or 0
        )
        active_complaints = Complaint.objects.filter(
            society_id=society_id,
            status__in=[Complaint.Status.OPEN, Complaint.Status.IN_PROGRESS],
        ).count()
        visitors_period = Visitor.objects.filter(
            society_id=society_id, created_at__gte=cutoff
        ).count()

        overview = {
            "total_collected":    float(total_collected),
            "total_expenses":     float(total_expenses),
            "remaining_balance":  float(total_collected - total_expenses),
            "active_complaints":  active_complaints,
            "visitors_period":    visitors_period,
            "period":             period,
        }

        # ── Monthly Collection Trend (last 6 months) ─────────────────────────
        six_months_ago = timezone.now() - timedelta(days=180)
        collection_trend = list(
            MaintenanceDue.objects
            .filter(
                society_id=society_id,
                status=MaintenanceDue.Status.PAID,
                month__gte=six_months_ago,
            )
            .annotate(mo=TruncMonth("month"))
            .values("mo")
            .annotate(amount=Sum("amount"), count=Count("id"))
            .order_by("mo")
        )
        for row in collection_trend:
            row["month"] = row.pop("mo").strftime("%b %Y")
            row["amount"] = float(row["amount"])

        # ── Monthly Expense Trend (last 6 months) ────────────────────────────
        expense_trend = list(
            MaintenanceExpense.objects
            .filter(
                society_id=society_id,
                expense_date__gte=six_months_ago,
            )
            .annotate(mo=TruncMonth("expense_date"))
            .values("mo")
            .annotate(amount=Sum("amount"), count=Count("id"))
            .order_by("mo")
        )
        for row in expense_trend:
            row["month"] = row.pop("mo").strftime("%b %Y")
            row["amount"] = float(row["amount"])

        # ── Complaint Analytics ───────────────────────────────────────────────
        complaint_by_category = list(
            Complaint.objects
            .filter(society_id=society_id, created_at__gte=cutoff)
            .values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        complaint_by_status = list(
            Complaint.objects
            .filter(society_id=society_id)
            .values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        complaint_monthly = list(
            Complaint.objects
            .filter(society_id=society_id, created_at__gte=six_months_ago)
            .annotate(mo=TruncMonth("created_at"))
            .values("mo")
            .annotate(count=Count("id"))
            .order_by("mo")
        )
        for row in complaint_monthly:
            row["month"] = row.pop("mo").strftime("%b %Y")

        # ── Visitor Analytics ────────────────────────────────────────────────
        visitor_by_type = list(
            Visitor.objects
            .filter(society_id=society_id, created_at__gte=cutoff)
            .values("visit_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        visitor_monthly = list(
            Visitor.objects
            .filter(society_id=society_id, created_at__gte=six_months_ago)
            .annotate(mo=TruncMonth("created_at"))
            .values("mo")
            .annotate(count=Count("id"))
            .order_by("mo")
        )
        for row in visitor_monthly:
            row["month"] = row.pop("mo").strftime("%b %Y")

        # ── Resident Occupancy ───────────────────────────────────────────────
        from apps.society_admin.flats.models import Flat
        from apps.society_admin.buildings.models import Building

        total_flats    = Flat.objects.filter(building__society_id=society_id).count()
        total_residents = UserProfile.objects.filter(
            society_id=society_id, role__slug="resident"
        ).count()
        active_residents = UserProfile.objects.filter(
            society_id=society_id,
            role__slug="resident",
            status=UserProfile.Status.ACTIVE,
        ).count()
        occupied_flats = (
            UserProfile.objects
            .filter(society_id=society_id, role__slug="resident", status=UserProfile.Status.ACTIVE)
            .exclude(flat_number="")
            .values("flat_number")
            .distinct()
            .count()
        )

        occupancy = {
            "total_flats":       total_flats,
            "occupied_flats":    occupied_flats,
            "vacant_flats":      max(total_flats - occupied_flats, 0),
            "occupancy_pct":     round(occupied_flats / total_flats * 100, 1) if total_flats else 0.0,
            "total_residents":   total_residents,
            "active_residents":  active_residents,
        }

        logger.info("SOCIETY_ANALYTICS | society=%s period=%s", society_id, period)

        return Response({
            "success": True,
            "data": {
                "period":            period,
                "overview":          overview,
                "collection_trend":  collection_trend,
                "expense_trend":     expense_trend,
                "complaint_chart": {
                    "by_category": complaint_by_category,
                    "by_status":   complaint_by_status,
                    "monthly":     complaint_monthly,
                },
                "visitor_chart": {
                    "by_type":  visitor_by_type,
                    "monthly":  visitor_monthly,
                },
                "occupancy": occupancy,
            },
        })