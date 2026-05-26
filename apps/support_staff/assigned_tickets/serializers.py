from rest_framework import serializers
from .models import SupportTicket


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


class SupportTicketSerializer(serializers.ModelSerializer):
    assigned_to_name  = serializers.CharField(source="assigned_to.full_name",  read_only=True, allow_null=True)
    created_by_name   = serializers.CharField(source="created_by.full_name",   read_only=True, allow_null=True)
    resident_display  = serializers.CharField(source="resident.full_name",     read_only=True, allow_null=True)
    category_display  = serializers.CharField(source="get_category_display",   read_only=True)
    priority_display  = serializers.CharField(source="get_priority_display",   read_only=True)
    status_display    = serializers.CharField(source="get_status_display",     read_only=True)
    time_ago          = serializers.SerializerMethodField()

    class Meta:
        model  = SupportTicket
        fields = [
            "id", "ticket_id", "subject", "description",
            "category", "category_display",
            "priority", "priority_display",
            "status", "status_display",
            "resident_name", "flat_number", "resident_phone",
            "resident", "resident_display",
            "assigned_to", "assigned_to_name",
            "created_by", "created_by_name",
            "created_at", "updated_at", "resolved_at",
            "resolution_notes", "feedback", "rating", "time_taken",
            "time_ago",
        ]
        read_only_fields = ["id", "ticket_id", "created_at", "updated_at"]

    def get_time_ago(self, obj) -> str:
        return _time_ago(obj.created_at)


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SupportTicket
        fields = [
            "subject", "description", "category", "priority",
            "resident_name", "flat_number", "resident_phone", "resident",
        ]
