from rest_framework import serializers


# ── Shared ────────────────────────────────────────────────────────────────────

class ChartPointSerializer(serializers.Serializer):
    date  = serializers.DateField()
    value = serializers.IntegerField()


class LabelCountSerializer(serializers.Serializer):
    label = serializers.CharField()
    count = serializers.IntegerField()
    pct   = serializers.FloatField()


# ── 1. Overview ───────────────────────────────────────────────────────────────

class OverviewReportSerializer(serializers.Serializer):
    period_days       = serializers.IntegerField()
    # Societies
    total_societies   = serializers.IntegerField()
    active_societies  = serializers.IntegerField()
    new_societies     = serializers.IntegerField()
    societies_growth_pct = serializers.FloatField()
    # Users
    total_users       = serializers.IntegerField()
    active_users      = serializers.IntegerField()
    new_users         = serializers.IntegerField()
    users_growth_pct  = serializers.FloatField()
    # Complaints
    total_complaints  = serializers.IntegerField()
    open_complaints   = serializers.IntegerField()
    resolved_complaints = serializers.IntegerField()
    resolution_rate   = serializers.FloatField()
    # Visitors
    total_visitors    = serializers.IntegerField()
    # Revenue
    mrr               = serializers.DecimalField(max_digits=14, decimal_places=2)
    # Top societies
    top_societies     = serializers.ListField(child=serializers.DictField())


# ── 2. Society Growth ─────────────────────────────────────────────────────────

class SocietyGrowthReportSerializer(serializers.Serializer):
    period_days  = serializers.IntegerField()
    total        = serializers.IntegerField()
    new_in_period = serializers.IntegerField()
    chart_data   = serializers.ListField(child=serializers.DictField())  # date, new, cumulative
    by_plan      = serializers.ListField(child=serializers.DictField())
    by_status    = serializers.ListField(child=serializers.DictField())
    top_cities   = serializers.ListField(child=serializers.DictField())


# ── 3. User Growth ────────────────────────────────────────────────────────────

class UserGrowthReportSerializer(serializers.Serializer):
    period_days   = serializers.IntegerField()
    total_users   = serializers.IntegerField()
    new_in_period = serializers.IntegerField()
    active        = serializers.IntegerField()
    suspended     = serializers.IntegerField()
    pending       = serializers.IntegerField()
    chart_data    = serializers.ListField(child=serializers.DictField())  # date, new, cumulative
    by_role       = serializers.ListField(child=serializers.DictField())
    by_society    = serializers.ListField(child=serializers.DictField())  # top 5


# ── 4. Revenue ────────────────────────────────────────────────────────────────

class RevenueReportSerializer(serializers.Serializer):
    period_days             = serializers.IntegerField()
    mrr                     = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_revenue           = serializers.DecimalField(max_digits=14, decimal_places=2)
    avg_revenue_per_society = serializers.FloatField()
    mrr_chart               = serializers.ListField(child=serializers.DictField())  # month, mrr
    by_plan                 = serializers.ListField(child=serializers.DictField())


# ── 5. Complaints ─────────────────────────────────────────────────────────────

class ComplaintReportSerializer(serializers.Serializer):
    period_days      = serializers.IntegerField()
    total            = serializers.IntegerField()
    open_count       = serializers.IntegerField()
    in_progress      = serializers.IntegerField()
    resolved         = serializers.IntegerField()
    closed           = serializers.IntegerField()
    resolution_rate  = serializers.FloatField()
    high_priority    = serializers.IntegerField()
    by_category      = serializers.ListField(child=serializers.DictField())
    by_priority      = serializers.ListField(child=serializers.DictField())
    by_status        = serializers.ListField(child=serializers.DictField())
    top_societies    = serializers.ListField(child=serializers.DictField())
    daily_chart      = serializers.ListField(child=serializers.DictField())  # date, new


# ── 6. Visitors ───────────────────────────────────────────────────────────────

class VisitorReportSerializer(serializers.Serializer):
    period_days     = serializers.IntegerField()
    total_visitors  = serializers.IntegerField()
    avg_daily       = serializers.FloatField()
    peak_day        = serializers.DictField()   # date, count
    by_visit_type   = serializers.ListField(child=serializers.DictField())
    by_status       = serializers.ListField(child=serializers.DictField())
    daily_chart     = serializers.ListField(child=serializers.DictField())
    top_societies   = serializers.ListField(child=serializers.DictField())
