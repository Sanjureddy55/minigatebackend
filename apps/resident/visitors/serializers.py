import hashlib
import random
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import GuestPass

VALIDITY_HOURS = {"1h": 1, "4h": 4, "8h": 8, "24h": 24}


def _generate_pass_code() -> str:
    """Returns a human-readable code like GW-7821-4403."""
    a = random.randint(1000, 9999)
    b = random.randint(1000, 9999)
    return f"GW-{a}-{b}"


class GuestPassSerializer(serializers.ModelSerializer):
    visit_type_display    = serializers.CharField(source="get_visit_type_display",    read_only=True)
    pass_validity_display = serializers.CharField(source="get_pass_validity_display", read_only=True)
    status_display        = serializers.CharField(source="get_status_display",        read_only=True)

    class Meta:
        model  = GuestPass
        fields = [
            "id", "flat", "created_by",
            "full_name", "mobile", "visit_type", "visit_type_display",
            "visit_date", "visit_time", "pass_validity", "pass_validity_display",
            "vehicle_number", "notes_for_guard",
            "pass_code", "qr_code", "status", "status_display", "valid_until",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "flat", "created_by",
            "pass_code", "qr_code", "valid_until",
            "created_at", "updated_at",
        ]

    def create(self, validated_data: dict) -> GuestPass:
        now = timezone.now()

        # Compute valid_until from visit_date + visit_time + pass_validity if provided
        visit_date = validated_data.get("visit_date")
        visit_time = validated_data.get("visit_time")
        if visit_date and visit_time:
            visit_dt = timezone.datetime.combine(visit_date, visit_time)
            if timezone.is_naive(visit_dt):
                visit_dt = timezone.make_aware(visit_dt)
            hours = VALIDITY_HOURS.get(validated_data.get("pass_validity", "1h"), 1)
            validated_data["valid_until"] = visit_dt + timedelta(hours=hours)
        elif "valid_until" not in validated_data or not validated_data.get("valid_until"):
            # Default: valid for 24 hours from now
            validated_data["valid_until"] = now + timedelta(hours=24)

        validated_data["pass_code"] = _generate_pass_code()

        token = hashlib.sha256(f"{uuid.uuid4()}{now}".encode()).hexdigest()[:32]
        validated_data["qr_code"] = f"MINIGATE-{validated_data['pass_code']}-{token[:8].upper()}"

        return super().create(validated_data)
