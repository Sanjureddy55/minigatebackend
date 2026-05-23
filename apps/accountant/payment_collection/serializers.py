from rest_framework import serializers

from apps.resident.payments.models import MaintenanceDue, ResidentPayment


class MaintenanceDueSerializer(serializers.ModelSerializer):
    flat_number     = serializers.CharField(source="flat.flat_number", read_only=True)
    building_name   = serializers.CharField(source="flat.building.name", read_only=True)
    status_display  = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = MaintenanceDue
        fields = [
            "id", "flat", "flat_number", "building_name",
            "month", "amount", "status", "status_display",
            "due_date", "paid_at", "description", "created_at",
        ]
        read_only_fields = ["id", "paid_at", "created_at"]


class GenerateDuesSerializer(serializers.Serializer):
    year        = serializers.IntegerField(min_value=2020, max_value=2100)
    month       = serializers.IntegerField(min_value=1, max_value=12)
    amount      = serializers.DecimalField(max_digits=10, decimal_places=2)
    due_day     = serializers.IntegerField(min_value=1, max_value=28, default=10,
                                           help_text="Day of month for due date (1-28).")
    description = serializers.CharField(max_length=255, default="Monthly Maintenance", required=False)


class MarkPaidSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=ResidentPayment.PaymentMethod.choices,
        default=ResidentPayment.PaymentMethod.UPI,
    )
    payment_date   = serializers.DateField(required=False)
    description    = serializers.CharField(max_length=255, default="", required=False)


class ResidentPaymentSerializer(serializers.ModelSerializer):
    flat_number            = serializers.CharField(source="flat.flat_number", read_only=True)
    building_name          = serializers.CharField(source="flat.building.name", read_only=True)
    resident_name          = serializers.CharField(source="resident.full_name", read_only=True)
    payment_type_display   = serializers.CharField(source="get_payment_type_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model  = ResidentPayment
        fields = [
            "id", "flat", "flat_number", "building_name",
            "resident", "resident_name",
            "payment_type", "payment_type_display",
            "payment_method", "payment_method_display",
            "amount", "description", "payment_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RecordPaymentSerializer(serializers.Serializer):
    flat            = serializers.UUIDField(help_text="Flat UUID")
    resident        = serializers.IntegerField(help_text="UserProfile id of the resident")
    payment_type    = serializers.ChoiceField(choices=ResidentPayment.PaymentType.choices)
    payment_method  = serializers.ChoiceField(
        choices=ResidentPayment.PaymentMethod.choices,
        default=ResidentPayment.PaymentMethod.UPI,
    )
    amount          = serializers.DecimalField(max_digits=12, decimal_places=2)
    description     = serializers.CharField(max_length=255, default="", required=False)
    payment_date    = serializers.DateField(required=False)
    maintenance_due = serializers.IntegerField(required=False, allow_null=True)


class PendingDueSerializer(serializers.ModelSerializer):
    """
    Serializer for the Pending Dues list page.
    Adds resident_name and days_overdue computed fields.
    resident_name is injected via context by the view (batch lookup, not per-row query).
    """
    flat_number    = serializers.CharField(source="flat.flat_number", read_only=True)
    building_name  = serializers.CharField(source="flat.building.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    month_display  = serializers.SerializerMethodField()
    days_overdue   = serializers.SerializerMethodField()
    resident_name  = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceDue
        fields = [
            "id", "flat", "flat_number", "building_name",
            "resident_name",
            "month", "month_display", "amount",
            "status", "status_display",
            "due_date", "days_overdue",
            "description", "created_at",
        ]
        read_only_fields = fields

    def get_month_display(self, obj):
        return obj.month.strftime("%b %Y") if obj.month else ""

    def get_days_overdue(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        if obj.due_date and today > obj.due_date:
            return (today - obj.due_date).days
        return 0

    def get_resident_name(self, obj):
        resident_map = self.context.get("resident_map", {})
        flat_num = obj.flat.flat_number if obj.flat_id else ""
        return resident_map.get(flat_num, "")


class PendingDuesSummarySerializer(serializers.Serializer):
    defaulters        = serializers.IntegerField()
    outstanding       = serializers.FloatField()
    overdue_60_days   = serializers.IntegerField()
    pending_count     = serializers.IntegerField()
    overdue_count     = serializers.IntegerField()
