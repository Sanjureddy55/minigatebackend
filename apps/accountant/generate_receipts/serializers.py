from rest_framework import serializers

from apps.resident.payments.models import ResidentPayment


class ReceiptSerializer(serializers.ModelSerializer):
    flat_number            = serializers.CharField(source="flat.flat_number",          read_only=True)
    building_name          = serializers.CharField(source="flat.building.name",         read_only=True)
    resident_name          = serializers.CharField(source="resident.full_name",         read_only=True)
    resident_mobile        = serializers.CharField(source="resident.mobile",            read_only=True)
    society_name           = serializers.CharField(source="society.name",               read_only=True)
    payment_type_display   = serializers.CharField(source="get_payment_type_display",   read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    due_month              = serializers.SerializerMethodField()
    receipt_number         = serializers.SerializerMethodField()

    class Meta:
        model  = ResidentPayment
        fields = [
            "id", "receipt_number",
            "society_name",
            "flat_number", "building_name",
            "resident_name", "resident_mobile",
            "payment_type", "payment_type_display",
            "payment_method", "payment_method_display",
            "amount", "description",
            "due_month",
            "payment_date", "created_at",
        ]
        read_only_fields = fields

    def get_due_month(self, obj):
        if obj.maintenance_due_id:
            try:
                return obj.maintenance_due.month.strftime("%b %Y")
            except Exception:
                pass
        return None

    def get_receipt_number(self, obj):
        return f"RCPT-{obj.pk:06d}"
