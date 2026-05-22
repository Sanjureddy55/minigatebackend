from rest_framework import serializers


class MaintenanceTransparencySerializer(serializers.Serializer):
    """
    KPI cards for the resident Maintenance Transparency screen.

    my_maintenance_paid  → flat's total paid this year (ResidentPayment)
    society_collection   → total MaintenanceDue.amount for the whole society (all flats)
    amount_used          → total published expenses (MaintenanceExpense)
    remaining_balance    → society_collection - amount_used
    fund_usage_pct       → (amount_used / society_collection) * 100
    published_expenses   → list of published expense proofs
    """

    my_maintenance_paid = serializers.FloatField()
    society_collection  = serializers.FloatField()
    amount_used         = serializers.FloatField()
    remaining_balance   = serializers.FloatField()
    fund_usage_pct      = serializers.FloatField()
    published_expenses  = serializers.ListField(child=serializers.DictField())
