from rest_framework import serializers

from .models import DeliveryEntry


class DeliveryEntrySerializer(serializers.ModelSerializer):
    """Full read serializer — all fields the guard's UI needs."""
    delivery_type_display = serializers.CharField(source="get_delivery_type_display", read_only=True)
    vendor_display        = serializers.CharField(source="get_vendor_display",        read_only=True)
    status_display        = serializers.CharField(source="get_status_display",        read_only=True)
    flat_number           = serializers.CharField(source="flat.flat_number",          read_only=True, allow_null=True)
    building_name         = serializers.CharField(source="flat.building.name",        read_only=True, allow_null=True)
    processed_by_name     = serializers.CharField(source="processed_by.full_name",    read_only=True, allow_null=True)
    approved_by_name      = serializers.CharField(source="approved_by.full_name",     read_only=True, allow_null=True)
    collected_by_name     = serializers.CharField(source="collected_by.full_name",    read_only=True, allow_null=True)
    otp_active            = serializers.SerializerMethodField()

    class Meta:
        model  = DeliveryEntry
        fields = [
            "id",
            "society",
            "flat", "flat_number", "building_name", "flat_number_raw",
            "agent_name", "agent_mobile", "company",
            "vendor", "vendor_display",
            "tracking_id", "recipient_name",
            "delivery_type", "delivery_type_display",
            "package_desc", "photo_url",
            "status", "status_display",
            "rejection_reason", "notes",
            "otp_verified", "otp_active",
            "processed_by", "processed_by_name",
            "approved_by", "approved_by_name",
            "collected_by", "collected_by_name",
            "arrived_at", "resolved_at", "collected_at",
        ]
        read_only_fields = [
            "id", "processed_by", "approved_by", "collected_by",
            "arrived_at", "resolved_at", "collected_at",
        ]

    def get_otp_active(self, obj) -> bool:
        """True if an OTP has been generated and has not yet expired/been used."""
        from django.utils import timezone
        return (
            bool(obj.otp_code)
            and not obj.otp_verified
            and (obj.otp_expires_at is None or timezone.now() <= obj.otp_expires_at)
        )


class DeliveryCreateSerializer(serializers.ModelSerializer):
    """Input for POST /api/security-guard/delivery-verify/ — register new delivery."""

    class Meta:
        model  = DeliveryEntry
        fields = [
            "flat", "flat_number_raw",
            "agent_name", "agent_mobile", "company",
            "vendor", "tracking_id", "recipient_name",
            "delivery_type", "package_desc", "photo_url", "notes",
        ]

    def validate(self, attrs):
        if not attrs.get("flat") and not attrs.get("flat_number_raw", "").strip():
            raise serializers.ValidationError(
                {"flat": "Provide either a flat (UUID) or flat_number_raw."}
            )
        return attrs


class DeliveryApproveSerializer(serializers.Serializer):
    """Optional note when manually approving (verbal confirmation)."""
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class DeliveryOTPVerifySerializer(serializers.Serializer):
    """Guard enters the 6-digit OTP shown by the delivery agent."""
    otp_code = serializers.CharField(
        min_length=6, max_length=6,
        help_text="6-digit OTP the delivery agent received from the resident.",
    )


class DeliveryRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class DeliveryAtGateSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=False, allow_blank=True, default="",
        help_text="e.g. 'Package stored at guard post shelf 2'",
    )


class DeliveryReturnSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False, allow_blank=True, default="",
        help_text="Why the package is being returned.",
    )


class DeliverySummarySerializer(serializers.Serializer):
    """Stats card data for the Delivery Verify dashboard."""
    date           = serializers.DateField()
    total_today    = serializers.IntegerField()
    pending        = serializers.IntegerField()
    approved       = serializers.IntegerField()
    rejected       = serializers.IntegerField()
    at_gate        = serializers.IntegerField()
    collected      = serializers.IntegerField()
    by_type        = serializers.DictField(child=serializers.IntegerField())
