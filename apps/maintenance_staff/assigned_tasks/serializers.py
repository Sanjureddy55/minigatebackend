from rest_framework import serializers
from .models import MaintenanceTask


def _time_ago(dt) -> str:
    from django.utils import timezone
    if not dt:
        return ""
    delta = timezone.now() - dt
    s = int(delta.total_seconds())
    if s < 3600:
        return f"{s // 60} min ago"
    if s < 86400:
        return f"{s // 3600} hr ago"
    days = s // 86400
    return f"{days} day{'s' if days > 1 else ''} ago"


class MaintenanceTaskSerializer(serializers.ModelSerializer):
    assignee_name    = serializers.CharField(source="assignee.full_name",  read_only=True, allow_null=True)
    created_by_name  = serializers.CharField(source="created_by.full_name",read_only=True, allow_null=True)
    category_display = serializers.CharField(source="get_category_display",  read_only=True)
    priority_display = serializers.CharField(source="get_priority_display",  read_only=True)
    status_display   = serializers.CharField(source="get_status_display",    read_only=True)
    time_ago         = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTask
        fields = [
            "id", "task_id", "title", "description",
            "category", "category_display",
            "location", "priority", "priority_display",
            "status", "status_display",
            "assignee", "assignee_name",
            "created_by", "created_by_name",
            "created_at", "updated_at", "started_at", "completed_at",
            "resolution_notes", "hours_logged", "rating",
            "time_ago",
        ]
        read_only_fields = ["id", "task_id", "created_at", "updated_at"]

    def get_time_ago(self, obj) -> str:
        return _time_ago(obj.created_at)


class MaintenanceTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MaintenanceTask
        fields = ["title", "description", "category", "location", "priority", "assignee"]
