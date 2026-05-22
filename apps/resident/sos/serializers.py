from rest_framework import serializers

from .models import SOSAlert


class SOSAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    status_display     = serializers.CharField(source="get_status_display",     read_only=True)
    resident_name      = serializers.CharField(source="resident.full_name",     read_only=True, allow_null=True)
    flat_number        = serializers.CharField(source="flat.flat_number",       read_only=True, allow_null=True)
    society_name       = serializers.CharField(source="society.name",           read_only=True, allow_null=True)
    resolved_by_name   = serializers.CharField(source="resolved_by.full_name",  read_only=True, allow_null=True)

    class Meta:
        model  = SOSAlert
        fields = [
            "id", "resident", "resident_name",
            "flat", "flat_number", "society", "society_name",
            "alert_type", "alert_type_display",
            "message", "location",
            "status", "status_display",
            "triggered_at", "resolved_at",
            "resolved_by", "resolved_by_name", "resolution_note",
        ]
        read_only_fields = ["id", "triggered_at", "resolved_at", "resolved_by", "status"]


class SOSResolveSerializer(serializers.Serializer):
    resolved_by     = serializers.IntegerField()
    resolution_note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
