from rest_framework import serializers

from .models import MaintenanceDue, ResidentPayment


class MaintenanceDueSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    flat_number    = serializers.CharField(source="flat.flat_number", read_only=True, allow_null=True)
    society_name   = serializers.CharField(source="society.name",     read_only=True, allow_null=True)

    class Meta:
        model  = MaintenanceDue
        fields = [
            "id", "flat", "flat_number", "society", "society_name",
            "month", "amount", "status", "status_display",
            "due_date", "paid_at", "description", "created_at",
        ]
        read_only_fields = ["id", "paid_at", "created_at"]


class ResidentPaymentSerializer(serializers.ModelSerializer):
    payment_type_display   = serializers.CharField(source="get_payment_type_display",   read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    flat_number            = serializers.CharField(source="flat.flat_number",   read_only=True, allow_null=True)
    resident_name          = serializers.CharField(source="resident.full_name", read_only=True, allow_null=True)

    class Meta:
        model  = ResidentPayment
        fields = [
            "id", "flat", "flat_number", "resident", "resident_name",
            "society", "maintenance_due", "notice",
            "payment_type", "payment_type_display",
            "payment_method", "payment_method_display",
            "amount", "description", "payment_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
