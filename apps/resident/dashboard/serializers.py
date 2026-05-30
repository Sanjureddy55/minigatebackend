from rest_framework import serializers


class ResidentDashboardSerializer(serializers.Serializer):
    """Flat-level KPI cards for the resident dashboard."""

    pending_bills             = serializers.FloatField()
    pending_bill_due_date     = serializers.CharField(allow_null=True)
    maintenance_paid          = serializers.FloatField()
    maintenance_paid_month    = serializers.CharField()
    society_fund_used         = serializers.FloatField()
    society_balance           = serializers.FloatField()
    open_complaints           = serializers.IntegerField()
    active_guest_passes       = serializers.IntegerField()
    pending_visitor_approvals = serializers.IntegerField()
    recent_notices            = serializers.ListField(child=serializers.DictField())

