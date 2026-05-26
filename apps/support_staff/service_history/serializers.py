from rest_framework import serializers
from apps.support_staff.assigned_tickets.models import SupportTicket


class ServiceHistorySerializer(serializers.ModelSerializer):
    assigned_to_name  = serializers.CharField(source="assigned_to.full_name", read_only=True, allow_null=True)
    category_display  = serializers.CharField(source="get_category_display",  read_only=True)
    priority_display  = serializers.CharField(source="get_priority_display",  read_only=True)
    status_display    = serializers.CharField(source="get_status_display",    read_only=True)

    class Meta:
        model  = SupportTicket
        fields = [
            "id", "ticket_id", "subject", "category", "category_display",
            "priority", "priority_display", "status", "status_display",
            "resident_name", "flat_number",
            "assigned_to", "assigned_to_name",
            "created_at", "resolved_at",
            "resolution_notes", "feedback", "rating", "time_taken",
        ]
