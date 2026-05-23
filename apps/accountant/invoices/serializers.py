from rest_framework import serializers

from apps.resident.payments.models import ResidentPayment, MaintenanceDue


class ReceiptSerializer(serializers.ModelSerializer):
    """Receipt view of a ResidentPayment — read-only, all key details."""
    flat_number            = serializers.CharField(source="flat.flat_number", read_only=True)
    building_name          = serializers.CharField(source="flat.building.name", read_only=True)
    resident_name          = serializers.CharField(source="resident.full_name", read_only=True)
    resident_mobile        = serializers.CharField(source="resident.mobile", read_only=True)
    society_name           = serializers.CharField(source="society.name", read_only=True)
    payment_type_display   = serializers.CharField(source="get_payment_type_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    due_month              = serializers.SerializerMethodField()

    class Meta:
        model  = ResidentPayment
        fields = [
            "id",
            "society_name",
            "flat_number", "building_name",
            "resident_name", "resident_mobile",
            "payment_type", "payment_type_display",
            "payment_method", "payment_method_display",
            "amount", "description",
            "payment_date", "created_at",
            "due_month",
        ]
        read_only_fields = fields

    def get_due_month(self, obj):
        if obj.maintenance_due_id:
            try:
                return obj.maintenance_due.month.strftime("%b %Y")
            except Exception:
                pass
        return None
