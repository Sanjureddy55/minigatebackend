from rest_framework import serializers

from .models import GuardShift


class GuardShiftSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    guard_name     = serializers.CharField(source="guard.full_name",    read_only=True)

    class Meta:
        model  = GuardShift
        fields = [
            "id",
            "society",
            "guard", "guard_name",
            "shift_date", "start_time", "end_time",
            "gate_assigned",
            "status", "status_display",
            "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
