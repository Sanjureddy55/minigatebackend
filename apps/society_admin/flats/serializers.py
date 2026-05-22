import logging

from rest_framework import serializers

from .models import Flat

logger = logging.getLogger(__name__)


class FlatSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source="building.name",                    read_only=True)
    society_id    = serializers.IntegerField(source="building.society.id",           read_only=True, allow_null=True)
    society_name  = serializers.CharField(source="building.society.name",            read_only=True, allow_null=True)
    city_name     = serializers.CharField(source="building.society.city.name",       read_only=True, allow_null=True)

    class Meta:
        model  = Flat
        fields = [
            "id", "flat_number",
            "building", "building_name",
            "society_id", "society_name", "city_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        building    = attrs.get("building",    getattr(self.instance, "building",    None))
        flat_number = attrs.get("flat_number", getattr(self.instance, "flat_number", None))
        if building and flat_number:
            qs = Flat.objects.filter(building=building, flat_number=flat_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"flat_number": f"Flat '{flat_number}' already exists in this building."}
                )
        return attrs
