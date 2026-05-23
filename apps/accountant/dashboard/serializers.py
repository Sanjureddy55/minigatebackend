from rest_framework import serializers


class MonthlyBillingRowSerializer(serializers.Serializer):
    month        = serializers.CharField()
    collected    = serializers.FloatField()
    outstanding  = serializers.FloatField()
    defaulters   = serializers.IntegerField()
    avg_pct      = serializers.FloatField()


class BillingDashboardSerializer(serializers.Serializer):
    collected_this_month = serializers.FloatField()
    outstanding          = serializers.FloatField()
    defaulters           = serializers.IntegerField()
    avg_collection_pct   = serializers.FloatField()
    monthly_history      = MonthlyBillingRowSerializer(many=True)
