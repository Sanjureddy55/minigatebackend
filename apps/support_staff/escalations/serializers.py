from rest_framework import serializers
from .models import Escalation


class EscalationSerializer(serializers.ModelSerializer):
    escalated_by_name = serializers.CharField(source="escalated_by.full_name", read_only=True, allow_null=True)
    reviewed_by_name  = serializers.CharField(source="reviewed_by.full_name",  read_only=True, allow_null=True)
    ticket_subject    = serializers.CharField(source="ticket.subject",          read_only=True)
    ticket_ref        = serializers.CharField(source="ticket.ticket_id",        read_only=True)

    class Meta:
        model  = Escalation
        fields = [
            "id", "ticket", "ticket_ref", "ticket_subject",
            "society", "escalated_to_role", "reason", "status",
            "escalated_by", "escalated_by_name",
            "reviewed_by", "reviewed_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "society", "escalated_by", "reviewed_by", "created_at", "updated_at"]
