from rest_framework import serializers


class QRCodeInputSerializer(serializers.Serializer):
    """Input for both /verify/ and /checkin/."""
    code = serializers.CharField(max_length=500, help_text="QR code content or typed passcode")


class GuestPassDetailSerializer(serializers.Serializer):
    """Full guest pass details returned to the guard after scanning."""
    pass_id       = serializers.IntegerField()
    qr_code       = serializers.CharField()

    full_name      = serializers.CharField()
    mobile         = serializers.CharField()
    vehicle_number = serializers.CharField()
    visit_type     = serializers.CharField()
    visit_type_display = serializers.CharField()
    notes_for_guard    = serializers.CharField()

    flat_number   = serializers.CharField(allow_null=True)
    building_name = serializers.CharField(allow_null=True)
    host_name     = serializers.CharField(allow_null=True)

    visit_date        = serializers.DateField()
    visit_time        = serializers.TimeField()
    valid_until       = serializers.DateTimeField(allow_null=True)
    pass_validity     = serializers.CharField()
    pass_validity_display = serializers.CharField()

    status         = serializers.CharField()
    status_display = serializers.CharField()

    is_valid      = serializers.BooleanField()
    error_reason  = serializers.CharField(allow_null=True)


class QRVerifyLogSerializer(serializers.Serializer):
    """One row in the Recent Verifications list."""
    id          = serializers.IntegerField()
    pass_code   = serializers.CharField()
    full_name   = serializers.CharField()
    is_valid    = serializers.BooleanField()
    verified_at = serializers.DateTimeField()
    time        = serializers.CharField()


class SamplePassCodeSerializer(serializers.Serializer):
    """One card in the Sample Valid Codes panel."""
    pass_id      = serializers.IntegerField()
    qr_code      = serializers.CharField()
    full_name    = serializers.CharField()
    flat_display = serializers.CharField()
    valid_until  = serializers.DateTimeField(allow_null=True)
