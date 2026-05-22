import hashlib
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import GuestPass

VALIDITY_HOURS = {"1h": 1, "4h": 4, "8h": 8, "24h": 24}


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
            "qr_code", "status", "status_display", "valid_until",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "qr_code", "valid_until", "created_at", "updated_at"]

    def create(self, validated_data: dict) -> GuestPass:
        visit_date = validated_data["visit_date"]
        visit_time = validated_data["visit_time"]
        hours      = VALIDITY_HOURS.get(validated_data["pass_validity"], 1)

        visit_dt = timezone.datetime.combine(visit_date, visit_time)
        if timezone.is_naive(visit_dt):
            visit_dt = timezone.make_aware(visit_dt)

        validated_data["valid_until"] = visit_dt + timedelta(hours=hours)

        token = hashlib.sha256(f"{uuid.uuid4()}{visit_dt}".encode()).hexdigest()[:32]
        validated_data["qr_code"] = f"MINIGATE-PASS-{token.upper()}"

        return super().create(validated_data)
