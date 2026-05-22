from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile

from .models import PlatformPayment, SupportTicket


class DashboardStatsSerializer(serializers.Serializer):
    # ── Total Societies card ───────────────────────────────────────────────────
    total_societies          = serializers.IntegerField()
    active_societies         = serializers.IntegerField()
    new_societies_this_month = serializers.IntegerField()   # "+3 this month"

    # ── Active Users card ──────────────────────────────────────────────────────
    active_users             = serializers.IntegerField()   # active status only
    users_mom_change         = serializers.IntegerField()   # vs same period last month

    # ── Open Tickets card ─────────────────────────────────────────────────────
    open_tickets             = serializers.IntegerField()
    societies_with_tickets   = serializers.IntegerField()   # "Across N societies"

    # ── MRR card ──────────────────────────────────────────────────────────────
    mrr                      = serializers.DecimalField(max_digits=14, decimal_places=2)
    mrr_mom_pct              = serializers.FloatField()     # "+8.4% MoM"

    @staticmethod
    def build():
        today      = timezone.localdate()
        now        = timezone.now()

        # ── Month boundaries ──────────────────────────────────────────────────
        month_start      = today.replace(day=1)
        last_month_end   = month_start - timezone.timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)

        # ── Societies ─────────────────────────────────────────────────────────
        soc_agg = Society.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(status=Society.Status.ACTIVE)),
            new_this_month=Count("id", filter=Q(created_at__date__gte=month_start)),
        )

        # ── Active users (and MoM delta) ──────────────────────────────────────
        active_users     = UserProfile.objects.filter(status=UserProfile.Status.ACTIVE).count()
        prev_active_users = UserProfile.objects.filter(
            status=UserProfile.Status.ACTIVE,
            created_at__date__lt=month_start,
        ).count()
        users_mom_change = active_users - prev_active_users

        # ── Open tickets (and across how many societies) ───────────────────────
        open_ticket_qs = SupportTicket.objects.filter(
            status__in=[SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS]
        )
        open_tickets          = open_ticket_qs.count()
        societies_with_tickets = open_ticket_qs.values("society").distinct().count()

        # ── MRR — current month vs last month ─────────────────────────────────
        def _mrr(year, month):
            return PlatformPayment.objects.filter(
                status=PlatformPayment.Status.PAID,
                payment_type=PlatformPayment.PaymentType.SUBSCRIPTION,
                payment_date__year=year,
                payment_date__month=month,
            ).aggregate(total=Sum("amount"))["total"] or 0

        mrr_current = _mrr(today.year, today.month)
        mrr_prev    = _mrr(last_month_start.year, last_month_start.month)

        if mrr_prev:
            mrr_mom_pct = round((float(mrr_current) - float(mrr_prev)) / float(mrr_prev) * 100, 1)
        else:
            mrr_mom_pct = 0.0

        return {
            "total_societies":          soc_agg["total"],
            "active_societies":         soc_agg["active"],
            "new_societies_this_month": soc_agg["new_this_month"],
            "active_users":             active_users,
            "users_mom_change":         users_mom_change,
            "open_tickets":             open_tickets,
            "societies_with_tickets":   societies_with_tickets,
            "mrr":                      mrr_current,
            "mrr_mom_pct":              mrr_mom_pct,
        }


# ── Society status/plan display labels ────────────────────────────────────────
_STATUS_DISPLAY = {
    Society.Status.ACTIVE:   "Active",
    Society.Status.INACTIVE: "Inactive",
}

_PLAN_DISPLAY = {
    Society.Plan.FREE:       "Free",
    Society.Plan.PRO:        "Pro",
    Society.Plan.ENTERPRISE: "Enterprise",
}


class SocietyDashboardSerializer(serializers.ModelSerializer):
    """
    One row in the Global Dashboard society table.

    Columns:  SOCIETY | CITY | PLAN | USERS | STATUS
    """
    user_count    = serializers.IntegerField(read_only=True)
    open_tickets  = serializers.IntegerField(read_only=True)
    city_name     = serializers.CharField(source="city.name",       read_only=True, allow_null=True)
    plan_display  = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model  = Society
        fields = [
            "id", "name",
            "city_name",
            "plan", "plan_display",
            "status", "status_display",
            "total_flats", "user_count", "open_tickets",
            "admin_email",
            "created_at",
        ]

    def get_plan_display(self, obj) -> str:
        return _PLAN_DISPLAY.get(obj.plan, obj.get_plan_display())

    def get_status_display(self, obj) -> str:
        return _STATUS_DISPLAY.get(obj.status, obj.status.title())
