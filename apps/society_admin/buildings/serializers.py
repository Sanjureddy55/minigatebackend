import logging

from rest_framework import serializers

from .models import Building

logger = logging.getLogger(__name__)


class BuildingSerializer(serializers.ModelSerializer):
    society_name   = serializers.CharField(source="society.name",      read_only=True, allow_null=True)
    city_name      = serializers.CharField(source="society.city.name", read_only=True, allow_null=True)
    flat_count     = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Building
        fields = [
            "id", "name",
            "society", "society_name", "city_name",
            "total_floors",
            "flat_count",
            "status", "status_display",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "society", "created_at", "updated_at"]

    def get_flat_count(self, obj) -> int:
        return obj.flats.count()

    def validate_name(self, value):
        return value.strip()

    def validate(self, attrs):
        # Duplicate name check (society injected by view, available via context)
        society = self.context.get("society") or getattr(self.instance, "society", None)
        name    = attrs.get("name", getattr(self.instance, "name", None))
        if society and name:
            qs = Building.objects.filter(society=society, name__iexact=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": f"A building named '{name}' already exists in this society."}
                )
        return attrs
