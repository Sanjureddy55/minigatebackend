from rest_framework import serializers


class FundKpiSerializer(serializers.Serializer):
    total_collected        = serializers.FloatField()
    total_expenses_used    = serializers.FloatField()
    remaining_balance      = serializers.FloatField()
    pending_dues           = serializers.FloatField()
    this_month_collection  = serializers.FloatField()
    this_month_expenses    = serializers.FloatField()
    usage_pct              = serializers.FloatField()
    usage_label            = serializers.CharField()
    usage_description      = serializers.CharField()


class FundExpenseRowSerializer(serializers.Serializer):
    id               = serializers.IntegerField()
    title            = serializers.CharField()
    category         = serializers.CharField()
    category_display = serializers.CharField()
    amount           = serializers.FloatField()
    vendor_name      = serializers.CharField(allow_blank=True)
    payment_mode     = serializers.CharField(allow_blank=True)
    invoice_number   = serializers.CharField(allow_blank=True)
    building_area    = serializers.CharField(allow_blank=True)
    proof_url        = serializers.CharField(allow_blank=True)
    has_proof        = serializers.BooleanField()
    expense_date     = serializers.DateField()
    is_published     = serializers.BooleanField()
    status_display   = serializers.CharField()
    visibility_display = serializers.CharField()


class FundTrendRowSerializer(serializers.Serializer):
    month      = serializers.CharField()
    collected  = serializers.FloatField()
    expenses   = serializers.FloatField()
    net        = serializers.FloatField()


class FundDashboardSerializer(serializers.Serializer):
    kpi             = FundKpiSerializer()
    latest_expenses = FundExpenseRowSerializer(many=True)
    monthly_trend   = FundTrendRowSerializer(many=True)
