from rest_framework import serializers

from .models import Gate, SecurityAlert


class GateSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Gate
        fields = ["id", "society", "name", "status", "status_display", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SecurityAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    status_display     = serializers.CharField(source="get_status_display",      read_only=True)
    acknowledged_by_name = serializers.CharField(
        source="acknowledged_by.full_name", read_only=True, allow_null=True
    )
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model  = SecurityAlert
        fields = [
            "id", "society",
            "alert_type", "alert_type_display",
            "description", "gate",
            "status", "status_display",
            "triggered_at", "time_ago",
            "acknowledged_by", "acknowledged_by_name", "acknowledged_at",
            "resolved_at",
        ]
        read_only_fields = ["id", "triggered_at", "acknowledged_at", "resolved_at"]

    def get_time_ago(self, obj) -> str:
        from django.utils import timezone
        delta = timezone.now() - obj.triggered_at
        minutes = int(delta.total_seconds() // 60)
        if minutes < 60:
            return f"{minutes} min ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hr ago"
        return f"{delta.days} days ago"


class SecurityDashboardSerializer(serializers.Serializer):
    open_gates       = serializers.IntegerField()
    total_gates      = serializers.IntegerField()
    guards_on_duty   = serializers.IntegerField()
    total_guards     = serializers.IntegerField()
    active_alerts    = serializers.IntegerField()
    events_today     = serializers.IntegerField()
    active_alert_list = SecurityAlertSerializer(many=True)
