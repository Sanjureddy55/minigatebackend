import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSuperAdmin

from apps.platform_admin.create_society.models import Society
from apps.platform_admin.dashboard.models import PlatformPayment
from apps.resident.complaints.models import Complaint
from apps.roles_permissions.models import UserProfile
from apps.society_admin.visitors.models import Visitor

from .serializers import (
    ComplaintReportSerializer,
    OverviewReportSerializer,
    RevenueReportSerializer,
    SocietyGrowthReportSerializer,
    UserGrowthReportSerializer,
    VisitorReportSerializer,
)

logger = logging.getLogger(__name__)

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}


def _period(request) -> int:
    key = request.query_params.get("period", "30d")
    return PERIOD_DAYS.get(key, 30)


def _pct(current, previous) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


def _breakdown(qs, count_field="id"):
    total = sum(r["cnt"] for r in qs)
    return [
        {
            "label": r.get("label") or r.get(list(r.keys())[0]) or "Unknown",
            "count": r["cnt"],
            "pct":   round(r["cnt"] / total * 100, 1) if total else 0,
        }
        for r in qs
    ]


# ── 1. Overview ───────────────────────────────────────────────────────────────

class OverviewReportView(APIView):
    """
    GET /api/platform-admin/global-reports/overview/?period=30d

    Platform-wide health snapshot:
      - Societies, Users, Complaints, Visitors counts
      - Growth % vs previous period
      - Top 5 societies by user count
      - MRR
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days     = _period(request)
        now      = timezone.now()
        cutoff   = now - timedelta(days=days)
        prev_cutoff = cutoff - timedelta(days=days)

        # Societies
        total_soc  = Society.objects.count()
        active_soc = Society.objects.filter(status=Society.Status.ACTIVE).count()
        new_soc    = Society.objects.filter(created_at__gte=cutoff).count()
        prev_soc   = Society.objects.filter(created_at__gte=prev_cutoff, created_at__lt=cutoff).count()

        # Users
        total_users  = UserProfile.objects.count()
        active_users = UserProfile.objects.filter(status=UserProfile.Status.ACTIVE).count()
        new_users    = UserProfile.objects.filter(created_at__gte=cutoff).count()
        prev_users   = UserProfile.objects.filter(created_at__gte=prev_cutoff, created_at__lt=cutoff).count()

        # Complaints
        comp_qs        = Complaint.objects.filter(created_at__gte=cutoff)
        total_comp     = comp_qs.count()
        open_comp      = comp_qs.filter(status=Complaint.Status.OPEN).count()
        resolved_comp  = comp_qs.filter(status__in=[Complaint.Status.RESOLVED, Complaint.Status.CLOSED]).count()
        res_rate       = round(resolved_comp / total_comp * 100, 1) if total_comp else 0.0

        # Visitors
        total_visitors = Visitor.objects.filter(created_at__gte=cutoff).count()

        # MRR
        today = timezone.localdate()
        mrr   = PlatformPayment.objects.filter(
            status=PlatformPayment.Status.PAID,
            payment_type=PlatformPayment.PaymentType.SUBSCRIPTION,
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Top 5 societies by user count
        top_societies = list(
            Society.objects
            .annotate(user_count=Count("user_profiles", filter=Q(user_profiles__status=UserProfile.Status.ACTIVE)))
            .order_by("-user_count")[:5]
            .values("id", "name", "user_count", "plan", "status")
        )

        data = {
            "period_days":        days,
            "total_societies":    total_soc,
            "active_societies":   active_soc,
            "new_societies":      new_soc,
            "societies_growth_pct": _pct(new_soc, prev_soc),
            "total_users":        total_users,
            "active_users":       active_users,
            "new_users":          new_users,
            "users_growth_pct":   _pct(new_users, prev_users),
            "total_complaints":   total_comp,
            "open_complaints":    open_comp,
            "resolved_complaints": resolved_comp,
            "resolution_rate":    res_rate,
            "total_visitors":     total_visitors,
            "mrr":                mrr,
            "top_societies":      top_societies,
        }
        return Response({"success": True, "data": OverviewReportSerializer(data).data})


# ── 2. Society Growth ─────────────────────────────────────────────────────────

class SocietyGrowthReportView(APIView):
    """
    GET /api/platform-admin/global-reports/society-growth/?period=30d

    Daily new society registrations + cumulative total.
    Breakdown by plan and status. Top 10 cities.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days   = _period(request)
        now    = timezone.now()
        cutoff = now - timedelta(days=days)
        today  = timezone.localdate()

        total     = Society.objects.count()
        new_count = Society.objects.filter(created_at__gte=cutoff).count()

        # Daily chart
        daily = (
            Society.objects
            .filter(created_at__gte=cutoff)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(new=Count("id"))
            .order_by("day")
        )
        cumulative = Society.objects.filter(created_at__lt=cutoff).count()
        chart_data = []
        for row in daily:
            cumulative += row["new"]
            chart_data.append({"date": row["day"], "new": row["new"], "cumulative": cumulative})

        # By plan
        by_plan_raw = Society.objects.values("plan").annotate(cnt=Count("id"))
        plan_labels = {Society.Plan.FREE: "Free", Society.Plan.PRO: "Pro", Society.Plan.ENTERPRISE: "Enterprise"}
        total_soc   = Society.objects.count()
        by_plan = [
            {
                "label": plan_labels.get(r["plan"], r["plan"]),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total_soc * 100, 1) if total_soc else 0,
            }
            for r in by_plan_raw
        ]

        # By status
        by_status_raw = Society.objects.values("status").annotate(cnt=Count("id"))
        status_labels = {Society.Status.ACTIVE: "Active", Society.Status.INACTIVE: "Inactive"}
        by_status = [
            {
                "label": status_labels.get(r["status"], r["status"]),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total_soc * 100, 1) if total_soc else 0,
            }
            for r in by_status_raw
        ]

        # Top cities
        top_cities = list(
            Society.objects
            .exclude(city=None)
            .values(city_name=Count("city__name"))
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
            .values("city__name", "count")
        )
        top_cities = [{"city": r["city__name"], "count": r["count"]} for r in top_cities]

        data = {
            "period_days":    days,
            "total":          total,
            "new_in_period":  new_count,
            "chart_data":     chart_data,
            "by_plan":        by_plan,
            "by_status":      by_status,
            "top_cities":     top_cities,
        }
        return Response({"success": True, "data": SocietyGrowthReportSerializer(data).data})


# ── 3. User Growth ────────────────────────────────────────────────────────────

class UserGrowthReportView(APIView):
    """
    GET /api/platform-admin/global-reports/user-growth/?period=30d

    Daily user registrations + cumulative total.
    Breakdown by role and top societies by user count.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days   = _period(request)
        now    = timezone.now()
        cutoff = now - timedelta(days=days)

        agg = UserProfile.objects.aggregate(
            total     = Count("id"),
            active    = Count("id", filter=Q(status=UserProfile.Status.ACTIVE)),
            suspended = Count("id", filter=Q(status=UserProfile.Status.INACTIVE)),
            pending   = Count("id", filter=Q(status=UserProfile.Status.PENDING)),
        )
        new_count = UserProfile.objects.filter(created_at__gte=cutoff).count()

        # Daily chart
        daily = (
            UserProfile.objects
            .filter(created_at__gte=cutoff)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(new=Count("id"))
            .order_by("day")
        )
        cumulative = UserProfile.objects.filter(created_at__lt=cutoff).count()
        chart_data = []
        for row in daily:
            cumulative += row["new"]
            chart_data.append({"date": row["day"], "new": row["new"], "cumulative": cumulative})

        # By role
        by_role_raw = (
            UserProfile.objects
            .exclude(role=None)
            .values("role__name")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")
        )
        total_users = agg["total"]
        by_role = [
            {
                "label": r["role__name"],
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total_users * 100, 1) if total_users else 0,
            }
            for r in by_role_raw
        ]

        # Top 5 societies by user count
        by_society = list(
            Society.objects
            .annotate(user_count=Count("user_profiles"))
            .order_by("-user_count")[:5]
            .values("id", "name", "user_count")
        )

        data = {
            "period_days":   days,
            "total_users":   agg["total"],
            "new_in_period": new_count,
            "active":        agg["active"],
            "suspended":     agg["suspended"],
            "pending":       agg["pending"],
            "chart_data":    chart_data,
            "by_role":       by_role,
            "by_society":    by_society,
        }
        return Response({"success": True, "data": UserGrowthReportSerializer(data).data})


# ── 4. Revenue ────────────────────────────────────────────────────────────────

class RevenueReportView(APIView):
    """
    GET /api/platform-admin/global-reports/revenue/?period=30d

    MRR, total revenue, monthly chart, revenue by plan.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days  = _period(request)
        today = timezone.localdate()

        # Current MRR
        mrr = PlatformPayment.objects.filter(
            status=PlatformPayment.Status.PAID,
            payment_type=PlatformPayment.PaymentType.SUBSCRIPTION,
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Total revenue all time
        total_revenue = PlatformPayment.objects.filter(
            status=PlatformPayment.Status.PAID,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Avg revenue per active society
        active_soc = Society.objects.filter(status=Society.Status.ACTIVE).count()
        avg_rev    = round(float(mrr) / active_soc, 2) if active_soc else 0.0

        # Monthly MRR chart (last 12 months)
        monthly = (
            PlatformPayment.objects
            .filter(
                status=PlatformPayment.Status.PAID,
                payment_type=PlatformPayment.PaymentType.SUBSCRIPTION,
            )
            .annotate(month=TruncMonth("payment_date"))
            .values("month")
            .annotate(mrr=Sum("amount"))
            .order_by("month")
        )
        mrr_chart = [{"month": r["month"].strftime("%Y-%m"), "mrr": float(r["mrr"])} for r in monthly]

        # Revenue by plan (match society plan → subscription price)
        from apps.platform_admin.subscription_plans.models import SubscriptionPlan
        plans = SubscriptionPlan.objects.filter(status=SubscriptionPlan.Status.ACTIVE)
        by_plan = []
        for plan in plans.order_by("sort_order"):
            societies = Society.objects.filter(plan=plan.slug).count()
            plan_revenue = float(plan.monthly_price) * societies if not plan.is_custom_pricing else 0
            by_plan.append({
                "plan":      plan.name,
                "slug":      plan.slug,
                "societies": societies,
                "monthly_price": float(plan.monthly_price),
                "est_mrr":   plan_revenue,
                "is_custom": plan.is_custom_pricing,
            })

        data = {
            "period_days":             days,
            "mrr":                     mrr,
            "total_revenue":           total_revenue,
            "avg_revenue_per_society": avg_rev,
            "mrr_chart":               mrr_chart,
            "by_plan":                 by_plan,
        }
        return Response({"success": True, "data": RevenueReportSerializer(data).data})


# ── 5. Complaints ─────────────────────────────────────────────────────────────

class ComplaintReportView(APIView):
    """
    GET /api/platform-admin/global-reports/complaints/?period=30d

    Platform-wide complaint analytics across all societies.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days   = _period(request)
        now    = timezone.now()
        cutoff = now - timedelta(days=days)

        qs = Complaint.objects.filter(created_at__gte=cutoff)

        agg = qs.aggregate(
            total       = Count("id"),
            open_count  = Count("id", filter=Q(status=Complaint.Status.OPEN)),
            in_progress = Count("id", filter=Q(status=Complaint.Status.IN_PROGRESS)),
            resolved    = Count("id", filter=Q(status=Complaint.Status.RESOLVED)),
            closed      = Count("id", filter=Q(status=Complaint.Status.CLOSED)),
            high_pri    = Count("id", filter=Q(priority__in=[Complaint.Priority.HIGH, Complaint.Priority.URGENT])),
        )

        total       = agg["total"]
        resolved    = agg["resolved"] + agg["closed"]
        res_rate    = round(resolved / total * 100, 1) if total else 0.0

        # By category
        by_cat_raw = qs.values("category").annotate(cnt=Count("id")).order_by("-cnt")
        by_category = [
            {
                "label": r["category"].replace("_", " ").title(),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total * 100, 1) if total else 0,
            }
            for r in by_cat_raw
        ]

        # By priority
        by_pri_raw = qs.values("priority").annotate(cnt=Count("id")).order_by("-cnt")
        by_priority = [
            {
                "label": r["priority"].title(),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total * 100, 1) if total else 0,
            }
            for r in by_pri_raw
        ]

        # By status
        by_status = [
            {"label": "Open",        "count": agg["open_count"],  "pct": round(agg["open_count"]  / total * 100, 1) if total else 0},
            {"label": "In Progress", "count": agg["in_progress"], "pct": round(agg["in_progress"] / total * 100, 1) if total else 0},
            {"label": "Resolved",    "count": agg["resolved"],    "pct": round(agg["resolved"]    / total * 100, 1) if total else 0},
            {"label": "Closed",      "count": agg["closed"],      "pct": round(agg["closed"]      / total * 100, 1) if total else 0},
        ]

        # Top 5 societies by complaint count
        top_societies = list(
            qs
            .values("society__name", "society_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Daily new complaints chart
        daily = (
            qs
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(new=Count("id"))
            .order_by("day")
        )
        daily_chart = [{"date": r["day"], "new": r["new"]} for r in daily]

        data = {
            "period_days":    days,
            "total":          total,
            "open_count":     agg["open_count"],
            "in_progress":    agg["in_progress"],
            "resolved":       agg["resolved"],
            "closed":         agg["closed"],
            "resolution_rate": res_rate,
            "high_priority":  agg["high_pri"],
            "by_category":    by_category,
            "by_priority":    by_priority,
            "by_status":      by_status,
            "top_societies":  top_societies,
            "daily_chart":    daily_chart,
        }
        return Response({"success": True, "data": ComplaintReportSerializer(data).data})


# ── 6. Visitors ───────────────────────────────────────────────────────────────

class VisitorReportView(APIView):
    """
    GET /api/platform-admin/global-reports/visitors/?period=30d

    Platform-wide visitor analytics across all societies.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days   = _period(request)
        now    = timezone.now()
        cutoff = now - timedelta(days=days)

        qs    = Visitor.objects.filter(created_at__gte=cutoff)
        total = qs.count()

        avg_daily = round(total / days, 1) if days else 0.0

        # Peak day
        peak_row = (
            qs
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")
            .first()
        )
        peak_day = {"date": peak_row["day"], "count": peak_row["cnt"]} if peak_row else {"date": None, "count": 0}

        # By visit type
        type_labels = {
            Visitor.VisitType.GUEST:    "Guest",
            Visitor.VisitType.DELIVERY: "Delivery",
            Visitor.VisitType.CAB:      "Cab",
            Visitor.VisitType.SERVICE:  "Service",
            Visitor.VisitType.OTHER:    "Other",
        }
        by_type_raw = qs.values("visit_type").annotate(cnt=Count("id")).order_by("-cnt")
        by_visit_type = [
            {
                "label": type_labels.get(r["visit_type"], r["visit_type"].title()),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total * 100, 1) if total else 0,
            }
            for r in by_type_raw
        ]

        # By status
        status_labels = {
            Visitor.Status.PENDING:  "Pending",
            Visitor.Status.APPROVED: "Approved",
            Visitor.Status.INSIDE:   "Inside",
            Visitor.Status.EXITED:   "Exited",
            Visitor.Status.REJECTED: "Rejected",
        }
        by_status_raw = qs.values("status").annotate(cnt=Count("id")).order_by("-cnt")
        by_status = [
            {
                "label": status_labels.get(r["status"], r["status"].title()),
                "count": r["cnt"],
                "pct":   round(r["cnt"] / total * 100, 1) if total else 0,
            }
            for r in by_status_raw
        ]

        # Daily chart
        daily = (
            qs
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                total   = Count("id"),
                guest   = Count("id", filter=Q(visit_type=Visitor.VisitType.GUEST)),
                delivery = Count("id", filter=Q(visit_type=Visitor.VisitType.DELIVERY)),
                service = Count("id", filter=Q(visit_type=Visitor.VisitType.SERVICE)),
            )
            .order_by("day")
        )
        daily_chart = [
            {"date": r["day"], "total": r["total"], "guest": r["guest"],
             "delivery": r["delivery"], "service": r["service"]}
            for r in daily
        ]

        # Top 5 societies by visitor count
        top_societies = list(
            qs
            .values("society__name", "society_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        data = {
            "period_days":    days,
            "total_visitors": total,
            "avg_daily":      avg_daily,
            "peak_day":       peak_day,
            "by_visit_type":  by_visit_type,
            "by_status":      by_status,
            "daily_chart":    daily_chart,
            "top_societies":  top_societies,
        }
        return Response({"success": True, "data": VisitorReportSerializer(data).data})