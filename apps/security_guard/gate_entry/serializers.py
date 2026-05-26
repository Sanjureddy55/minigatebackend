import csv
import io

from rest_framework import serializers

from .models import GateEntry


class GateEntrySerializer(serializers.ModelSerializer):
    entry_type_display = serializers.CharField(source="get_entry_type_display", read_only=True)
    direction_display  = serializers.CharField(source="get_direction_display",  read_only=True)
    processed_by_name  = serializers.CharField(source="processed_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model  = GateEntry
        fields = [
            "id",
            "society",
            "visitor_name", "mobile", "vehicle_number",
            "entry_type", "entry_type_display",
            "direction", "direction_display",
            "flat_number", "gate", "purpose", "photo_url",
            "processed_by", "processed_by_name",
            "logged_at", "updated_at",
        ]
        read_only_fields = ["id", "processed_by", "logged_at", "updated_at"]


class GateEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GateEntry
        fields = [
            "visitor_name", "mobile", "vehicle_number",
            "entry_type", "direction",
            "flat_number", "gate", "purpose", "photo_url",
        ]


class EntryExitLogSerializer(serializers.Serializer):
    """Row for the Entry / Exit Logs page — sourced from the Visitor model."""
    id                 = serializers.IntegerField()
    visitor_name       = serializers.CharField()
    mobile             = serializers.CharField()
    visit_type         = serializers.CharField()
    visit_type_display = serializers.CharField()
    flat_display       = serializers.CharField()
    host_name          = serializers.CharField()
    purpose            = serializers.CharField()
    vehicle_number     = serializers.CharField()
    checked_in_at      = serializers.DateTimeField()
    checked_out_at     = serializers.DateTimeField(allow_null=True)
    status             = serializers.CharField()
    status_display     = serializers.CharField()
