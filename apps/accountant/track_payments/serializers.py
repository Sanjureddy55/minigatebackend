from rest_framework import serializers

from apps.resident.payments.models import ResidentPayment


class TrackPaymentSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a ResidentPayment for the accountant's
    Track Payments page.

    status / status_display are derived — not stored on the model:
      - If no maintenance_due → "approved"  (manually recorded, trusted)
      - If maintenance_due.status == "paid" → "approved"
      - Otherwise (pending / overdue)       → "pending"
    """
    flat_number            = serializers.CharField(source="flat.flat_number",          read_only=True)
    building_name          = serializers.CharField(source="flat.building.name",         read_only=True)
    resident_name          = serializers.CharField(source="resident.full_name",         read_only=True)
    payment_type_display   = serializers.CharField(source="get_payment_type_display",   read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    status                 = serializers.SerializerMethodField()
    status_display         = serializers.SerializerMethodField()
    due_month              = serializers.SerializerMethodField()

    class Meta:
        model  = ResidentPayment
        fields = [
            "id",
            "flat", "flat_number", "building_name",
            "resident", "resident_name",
            "payment_type", "payment_type_display",
            "payment_method", "payment_method_display",
            "amount",
            "status", "status_display",
            "due_month",
            "description", "payment_date", "created_at",
        ]
        read_only_fields = fields

    def get_status(self, obj):
        if obj.maintenance_due_id is None:
            return "approved"
        if obj.maintenance_due.status == "paid":
            return "approved"
        return "pending"

    def get_status_display(self, obj):
        return "Approved" if self.get_status(obj) == "approved" else "Pending"

    def get_due_month(self, obj):
        if obj.maintenance_due and obj.maintenance_due.month:
            return obj.maintenance_due.month.strftime("%b %Y")
        return None


class TrackPaymentSummarySerializer(serializers.Serializer):
    total_payments    = serializers.IntegerField()
    approved_count    = serializers.IntegerField()
    pending_count     = serializers.IntegerField()
    this_month_total  = serializers.FloatField()
    by_method         = serializers.DictField(child=serializers.FloatField())
