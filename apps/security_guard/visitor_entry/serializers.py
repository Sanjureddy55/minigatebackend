from rest_framework import serializers

from apps.society_admin.visitors.models import Visitor


class RegisterVisitorSerializer(serializers.Serializer):
    """
    Body for POST /api/security-guard/visitor-entry/
    Guard registers a new visitor at the gate.
    """
    full_name      = serializers.CharField(max_length=200)
    mobile         = serializers.CharField(max_length=20)
    visit_type     = serializers.ChoiceField(choices=Visitor.VisitType.choices, default=Visitor.VisitType.GUEST)
    flat           = serializers.UUIDField(required=False, allow_null=True, help_text="UUID of the destination flat")
    host_name      = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    purpose        = serializers.CharField(required=False, allow_blank=True, default="")
    vehicle_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    photo_url      = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class VisitorSearchResultSerializer(serializers.Serializer):
    """Slim result row for the gate search bar."""
    id           = serializers.IntegerField()
    type         = serializers.CharField()          # "visitor" | "resident" | "approved"
    full_name    = serializers.CharField()
    mobile       = serializers.CharField()
    flat_number  = serializers.CharField(allow_null=True)
    building     = serializers.CharField(allow_null=True)
    status       = serializers.CharField(allow_null=True)
    visit_type   = serializers.CharField(allow_null=True)
    checked_in_at  = serializers.DateTimeField(allow_null=True)
    checked_out_at = serializers.DateTimeField(allow_null=True)
