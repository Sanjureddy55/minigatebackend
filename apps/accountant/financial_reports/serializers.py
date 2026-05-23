from rest_framework import serializers


class PaymentTypeBreakdownSerializer(serializers.Serializer):
    payment_type   = serializers.CharField()
    count          = serializers.IntegerField()
    total          = serializers.FloatField()


class PaymentMethodBreakdownSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    count          = serializers.IntegerField()
    total          = serializers.FloatField()


class MonthlyReportRowSerializer(serializers.Serializer):
    month      = serializers.CharField()
    collected  = serializers.FloatField()
    expenses   = serializers.FloatField()
    net        = serializers.FloatField()
    paid_dues  = serializers.IntegerField()
    defaulters = serializers.IntegerField()


class FinancialReportSerializer(serializers.Serializer):
    period                  = serializers.CharField()
    total_collected         = serializers.FloatField()
    total_expenses          = serializers.FloatField()
    net_balance             = serializers.FloatField()
    total_dues_generated    = serializers.IntegerField()
    total_dues_paid         = serializers.IntegerField()
    total_dues_pending      = serializers.IntegerField()
    total_dues_overdue      = serializers.IntegerField()
    collection_rate_pct     = serializers.FloatField()
    by_payment_type         = PaymentTypeBreakdownSerializer(many=True)
    by_payment_method       = PaymentMethodBreakdownSerializer(many=True)
    monthly_trend           = MonthlyReportRowSerializer(many=True)
