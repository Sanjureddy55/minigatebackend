from rest_framework import serializers


class PaymentOverviewItemSerializer(serializers.Serializer):
    flat_number  = serializers.CharField()
    building     = serializers.CharField()
    resident     = serializers.CharField()
    amount       = serializers.DecimalField(max_digits=10, decimal_places=2)
    due_date     = serializers.DateField()
    status       = serializers.CharField()
    status_display = serializers.CharField()


class PaymentOverviewSerializer(serializers.Serializer):
    collected_this_month = serializers.DecimalField(max_digits=14, decimal_places=2)
    outstanding          = serializers.DecimalField(max_digits=14, decimal_places=2)
    defaulters           = serializers.IntegerField()
    avg_collection_pct   = serializers.FloatField()
    dues                 = PaymentOverviewItemSerializer(many=True)
