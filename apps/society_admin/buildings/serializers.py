import logging

from rest_framework import serializers

from apps.platform_admin.create_society.models import Society

from .models import Building

logger = logging.getLogger(__name__)


class BuildingSerializer(serializers.ModelSerializer):
    society_name = serializers.CharField(source="society.name",          read_only=True, allow_null=True)
    city_name    = serializers.CharField(source="society.city.name",     read_only=True, allow_null=True)
    flat_count   = serializers.SerializerMethodField()

    class Meta:
        model  = Building
        fields = [
            "id", "name",
            "society", "society_name", "city_name",
            "flat_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_flat_count(self, obj) -> int:
        return obj.flats.count()

    def validate(self, attrs):
        society = attrs.get("society", getattr(self.instance, "society", None))
        name    = attrs.get("name",    getattr(self.instance, "name",    None))
        if society and name:
            qs = Building.objects.filter(society=society, name__iexact=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": f"A building named '{name}' already exists in this society."}
                )
        return attrs
