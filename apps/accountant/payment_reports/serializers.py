from rest_framework import serializers


class PaymentMethodBreakdownSerializer(serializers.Serializer):
    method        = serializers.CharField()
    method_display= serializers.CharField()
    count         = serializers.IntegerField()
    total         = serializers.FloatField()
    percentage    = serializers.FloatField()


class PaymentTypeBreakdownSerializer(serializers.Serializer):
    type          = serializers.CharField()
    type_display  = serializers.CharField()
    count         = serializers.IntegerField()
    total         = serializers.FloatField()
    percentage    = serializers.FloatField()


class MonthlyPaymentRowSerializer(serializers.Serializer):
    month         = serializers.CharField()
    count         = serializers.IntegerField()
    total         = serializers.FloatField()
    approved      = serializers.IntegerField()
    pending       = serializers.IntegerField()


class PaymentReportSerializer(serializers.Serializer):
    period              = serializers.CharField()
    total_payments      = serializers.IntegerField()
    total_amount        = serializers.FloatField()
    approved_count      = serializers.IntegerField()
    pending_count       = serializers.IntegerField()
    avg_payment_amount  = serializers.FloatField()
    by_method           = PaymentMethodBreakdownSerializer(many=True)
    by_type             = PaymentTypeBreakdownSerializer(many=True)
    monthly_trend       = MonthlyPaymentRowSerializer(many=True)
