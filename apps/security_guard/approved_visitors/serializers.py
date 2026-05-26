from rest_framework import serializers


class ApprovedVisitorRowSerializer(serializers.Serializer):
    """
    Unified row for the Approved Visitors table.
    Combines GuestPass (pre-approved) and Visitor (real-time approved) records.

    UI columns:  VISITOR | FLAT | VALID TILL | STATUS
    """
    # Row identity
    id          = serializers.IntegerField()
    source      = serializers.ChoiceField(
        choices=["guest_pass", "visitor"],
        help_text="'guest_pass' = resident pre-approved; 'visitor' = real-time approved today",
    )

    # Table columns
    visitor_name       = serializers.CharField()
    mobile             = serializers.CharField()
    flat_display       = serializers.CharField(help_text="e.g. 'A-402'")
    building_name      = serializers.CharField(allow_null=True)
    flat_id            = serializers.UUIDField(allow_null=True)

    visit_type         = serializers.CharField()
    visit_type_display = serializers.CharField()

    valid_till         = serializers.TimeField(allow_null=True, help_text="Time guard should let in until")
    valid_till_date    = serializers.DateField(allow_null=True)
    status             = serializers.CharField()
    status_display     = serializers.CharField()

    # Extra context guard may need
    vehicle_number     = serializers.CharField()
    notes_for_guard    = serializers.CharField()
    host_name          = serializers.CharField(allow_null=True)
    qr_code            = serializers.CharField(allow_null=True, help_text="QR code for GuestPass rows")

    # Timestamps
    created_at         = serializers.DateTimeField()
    checked_in_at      = serializers.DateTimeField(allow_null=True)


class ApprovedVisitorStatsSerializer(serializers.Serializer):
    """Summary counts shown above the table."""
    total           = serializers.IntegerField()
    pre_approved    = serializers.IntegerField(help_text="Active GuestPasses")
    realtime        = serializers.IntegerField(help_text="Visitors approved today in real-time")
    checked_in      = serializers.IntegerField(help_text="Already inside / checked in")
    expiring_soon   = serializers.IntegerField(help_text="Valid for less than 30 minutes")


class ApprovedVisitorKpiSerializer(serializers.Serializer):
    """3 KPI cards shown at the top of the Approved Visitors page."""
    waiting_at_gate = serializers.IntegerField(help_text="APPROVED status — waiting to be let in")
    already_inside  = serializers.IntegerField(help_text="INSIDE status — already checked in")
    pass_expired    = serializers.IntegerField(help_text="EXPIRED GuestPasses for today")
