from rest_framework import serializers
from .models import Delivery


class DeliverySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    time_slot      = serializers.SerializerMethodField()

    class Meta:
        model  = Delivery
        fields = [
            "id", "delivery_id", "item_name", "vendor_name", "tracking_number",
            "resident_name", "resident_phone", "flat_number",
            "status", "status_display", "delivery_note", "failure_reason",
            "time_slot", "time_slot_start", "time_slot_end",
            "picked_up_at", "delivered_at", "failed_at", "created_at",
        ]

    def get_time_slot(self, obj):
        if obj.time_slot_start and obj.time_slot_end:
            return f"{obj.time_slot_start.strftime('%H:%M')}-{obj.time_slot_end.strftime('%H:%M')}"
        return ""


class DeliveryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Delivery
        fields = [
            "item_name", "vendor_name", "tracking_number",
            "resident_name", "resident_phone", "flat_number",
            "delivery_note", "time_slot_start", "time_slot_end",
        ]
