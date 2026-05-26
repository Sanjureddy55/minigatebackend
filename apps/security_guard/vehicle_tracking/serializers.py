from rest_framework import serializers

from .models import VehicleLog


class VehicleLogSerializer(serializers.ModelSerializer):
    vehicle_type_display = serializers.CharField(source="get_vehicle_type_display", read_only=True)
    action_display       = serializers.CharField(source="get_action_display",       read_only=True)
    logged_by_name       = serializers.CharField(source="logged_by.full_name",      read_only=True, allow_null=True)
    flat_number          = serializers.CharField(source="flat.flat_number",         read_only=True, allow_null=True)
    building_name        = serializers.CharField(source="flat.building.name",       read_only=True, allow_null=True)

    class Meta:
        model  = VehicleLog
        fields = [
            "id",
            "society",
            "vehicle_number", "vehicle_type", "vehicle_type_display",
            "owner_name",
            "flat", "flat_number", "building_name",
            "action", "action_display",
            "notes",
            "logged_by", "logged_by_name",
            "logged_at",
        ]
        read_only_fields = ["id", "logged_by", "logged_at"]


class VehicleLogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VehicleLog
        fields = ["vehicle_number", "vehicle_type", "owner_name", "flat", "action", "notes"]
