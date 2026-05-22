from rest_framework import serializers

from .models import StaffMember


class StaffMemberSerializer(serializers.ModelSerializer):
    role_display   = serializers.CharField(source="get_role_display",   read_only=True)
    shift_display  = serializers.CharField(source="get_shift_display",  read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    society_name   = serializers.CharField(source="society.name",       read_only=True)

    class Meta:
        model  = StaffMember
        fields = [
            "id", "society", "society_name",
            "full_name", "phone", "email",
            "role", "role_display",
            "shift", "shift_display",
            "status", "status_display",
            "gate_assigned", "joined_date", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StaffKPISerializer(serializers.Serializer):
    total_staff  = serializers.IntegerField()
    guards       = serializers.IntegerField()
    housekeeping = serializers.IntegerField()
    maintenance  = serializers.IntegerField()
    on_leave     = serializers.IntegerField()
