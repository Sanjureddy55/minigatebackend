from django.utils import timezone
from rest_framework import serializers

from .models import EmergencyAlert


def _time_ago(dt) -> str:
    if not dt:
        return ""
    diff = timezone.now() - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{diff.days}d ago"


class EmergencyAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    status_display     = serializers.CharField(source="get_status_display",     read_only=True)
    raised_by_name     = serializers.CharField(source="raised_by.full_name",    read_only=True, allow_null=True)
    raised_by_mobile   = serializers.CharField(source="raised_by.mobile",       read_only=True, allow_null=True)
    resolved_by_name   = serializers.CharField(source="resolved_by.full_name",  read_only=True, allow_null=True)
    gate               = serializers.CharField(source="location",               read_only=True)
    time_ago           = serializers.SerializerMethodField()

    def get_time_ago(self, obj):
        return _time_ago(obj.raised_at)

    class Meta:
        model  = EmergencyAlert
        fields = [
            "id",
            "society",
            "alert_type", "alert_type_display",
            "description", "location", "gate",
            "raised_by", "raised_by_name", "raised_by_mobile",
            "resolved_by", "resolved_by_name",
            "status", "status_display",
            "resolution_notes",
            "raised_at", "resolved_at",
            "time_ago",
        ]
        read_only_fields = ["id", "raised_by", "resolved_by", "raised_at", "resolved_at"]


class RaiseAlertSerializer(serializers.Serializer):
    alert_type  = serializers.ChoiceField(choices=EmergencyAlert.AlertType.choices)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location    = serializers.CharField(required=False, allow_blank=True, default="")


class ResolveAlertSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(required=False, allow_blank=True, default="")
