from rest_framework import serializers
from .models import TicketUpdate


class TicketUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model  = TicketUpdate
        fields = ["id", "ticket", "update_note", "status", "updated_by", "updated_by_name", "created_at"]
        read_only_fields = ["id", "updated_by", "created_at"]
