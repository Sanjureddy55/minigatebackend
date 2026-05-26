from rest_framework import serializers


class ResidentContactSerializer(serializers.Serializer):
    """One resident (occupant) of a flat."""
    resident_id        = serializers.IntegerField()
    full_name          = serializers.CharField()
    mobile             = serializers.CharField(help_text="Guard can use this for direct call")
    is_primary         = serializers.BooleanField(help_text="Primary / owner occupant of the flat")
    resident_type      = serializers.CharField(help_text="'owner' if primary, 'tenant' otherwise")


class FlatContactSummarySerializer(serializers.Serializer):
    """
    One row in the Contact Resident list.
    Frontend renders: flat_display, building_name, resident_count, family_member_count, and residents.
    """
    flat_id              = serializers.UUIDField()
    flat_number          = serializers.CharField()
    flat_display         = serializers.CharField(help_text="e.g. 'A-402'")
    building_name        = serializers.CharField()
    resident_count       = serializers.IntegerField()
    family_member_count  = serializers.IntegerField(default=0)
    residents            = ResidentContactSerializer(many=True)


class FlatContactDetailSerializer(serializers.Serializer):
    """Full contact card for a flat — all residents with mobile numbers."""
    flat_id              = serializers.UUIDField()
    flat_number          = serializers.CharField()
    flat_display         = serializers.CharField()
    building_name        = serializers.CharField()
    resident_count       = serializers.IntegerField()
    family_member_count  = serializers.IntegerField(default=0)
    residents            = ResidentContactSerializer(many=True)


class ContactResidentStatsSerializer(serializers.Serializer):
    """KPI stats for the Contact Resident page header."""
    total_flats          = serializers.IntegerField()
    total_residents      = serializers.IntegerField()
    owners               = serializers.IntegerField(default=0)
    tenants              = serializers.IntegerField(default=0)
    family_members       = serializers.IntegerField()
