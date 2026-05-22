from rest_framework import serializers


class FundKpiSerializer(serializers.Serializer):
    """6 KPI cards on the Fund Dashboard."""
    total_collected        = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expenses_used    = serializers.DecimalField(max_digits=14, decimal_places=2)
    remaining_balance      = serializers.DecimalField(max_digits=14, decimal_places=2)
    pending_dues           = serializers.DecimalField(max_digits=14, decimal_places=2)
    this_month_collection  = serializers.DecimalField(max_digits=14, decimal_places=2)
    this_month_expenses    = serializers.DecimalField(max_digits=14, decimal_places=2)

    # Fund usage progress bar
    usage_pct              = serializers.FloatField()   # 61.9
    usage_label            = serializers.CharField()    # "61.9% used"
    usage_description      = serializers.CharField()    # "₹2,78,500 used from ₹4,50,000 collected."


class PublishedExpenseRowSerializer(serializers.Serializer):
    """One row in the 'Latest published expenses' table."""
    id               = serializers.IntegerField()
    title            = serializers.CharField()
    category         = serializers.CharField()
    category_display = serializers.CharField()
    amount           = serializers.DecimalField(max_digits=12, decimal_places=2)
    proof_url        = serializers.CharField(allow_blank=True)
    expense_date     = serializers.DateField()
    is_published     = serializers.BooleanField()
    status_display   = serializers.CharField()   # "Published" | "Draft"
    vendor_name      = serializers.CharField(allow_blank=True)


class FundDashboardSerializer(serializers.Serializer):
    """Complete Fund Dashboard response."""
    kpi              = FundKpiSerializer()
    latest_expenses  = PublishedExpenseRowSerializer(many=True)
