from django.utils import timezone
from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()
    time_ago      = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = [
            "id",
            "actor_display",
            "actor_role",
            "actor_name",
            "action",
            "action_type",
            "target",
            "target_type",
            "target_id",
            "metadata",
            "created_at",
            "time_ago",
        ]

    def get_actor_display(self, obj) -> str:
        if obj.actor_name == "System":
            return "System"
        return obj.actor_role + " · " + obj.actor_name

    def get_time_ago(self, obj) -> str:
        delta = timezone.now() - obj.created_at
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return "just now"
        if seconds < 3600:
            m = seconds // 60
            return f"{m} min ago"
        if seconds < 86400:
            h = seconds // 3600
            return f"{h} hr ago"
        d = seconds // 86400
        return f"{d} day{'s' if d != 1 else ''} ago"
