import logging

from rest_framework import serializers

from apps.society_admin.buildings.models import Building

from .models import Flat

logger = logging.getLogger(__name__)


class FlatSerializer(serializers.ModelSerializer):
    """
    Flat detail — includes building info, owner, tenant, and occupancy status.
    Matches the Flat Management UI columns: FLAT, BUILDING, OWNER, TENANT, STATUS.
    """

    building_name = serializers.CharField(source="building.name",          read_only=True)
    society_name  = serializers.CharField(source="building.society.name",  read_only=True, allow_null=True)

    # Derived from ResidentFlat links — computed in get_* methods
    owner         = serializers.SerializerMethodField()
    tenant        = serializers.SerializerMethodField()
    status        = serializers.SerializerMethodField()   # occupied / vacant / pending

    class Meta:
        model  = Flat
        fields = [
            "id", "flat_number",
            "building", "building_name",
            "society_name",
            "owner", "tenant", "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _get_resident_flats(self, obj):
        """Cached ResidentFlat queryset for this flat."""
        if not hasattr(obj, "_rf_cache"):
            obj._rf_cache = list(
                obj.resident_occupants
                .filter(status__in=["active", "pending"])
                .select_related("profile")
            )
        return obj._rf_cache

    def get_owner(self, obj) -> str | None:
        for rf in self._get_resident_flats(obj):
            if rf.is_primary and rf.status == "active":
                return rf.profile.full_name
        return None

    def get_tenant(self, obj) -> str | None:
        for rf in self._get_resident_flats(obj):
            if not rf.is_primary and rf.status == "active":
                return rf.profile.full_name
        return None

    def get_status(self, obj) -> str:
        rfs = self._get_resident_flats(obj)
        active  = [r for r in rfs if r.status == "active"]
        pending = [r for r in rfs if r.status == "pending"]
        if active:
            return "active"
        if pending:
            return "pending"
        return "vacant"

    def validate_flat_number(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        building    = attrs.get("building",    getattr(self.instance, "building",    None))
        flat_number = attrs.get("flat_number", getattr(self.instance, "flat_number", None))
        if building and flat_number:
            qs = Flat.objects.filter(building=building, flat_number=flat_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"flat_number": f"Flat '{flat_number}' already exists in {building.name}."}
                )
        return attrs


class FlatCreateSerializer(serializers.Serializer):
    """
    Simple 'Add Flat' form — matches the UI.
    Accepts building by name (not UUID).

    Fields:
      flat_number  — e.g. "A-402"
      building     — building name e.g. "Block A"
    """

    flat_number = serializers.CharField(max_length=20)
    building    = serializers.CharField(max_length=200,
                                        help_text="Building name, e.g. 'Block A'")

    def validate_flat_number(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        society     = self.context["society"]
        flat_number = attrs["flat_number"]
        bname       = attrs["building"].strip()

        # Resolve building by name within the society
        building = (
            Building.objects
            .filter(society=society, name__iexact=bname)
            .first()
        )
        if not building:
            available = list(
                Building.objects
                .filter(society=society)
                .values_list("name", flat=True)
            )
            raise serializers.ValidationError({
                "building": (
                    f"Building '{bname}' not found. "
                    f"Available: {', '.join(available) or 'none'}."
                )
            })

        # Duplicate flat check
        if Flat.objects.filter(building=building, flat_number=flat_number).exists():
            raise serializers.ValidationError({
                "flat_number": f"Flat '{flat_number}' already exists in {building.name}."
            })

        attrs["building_obj"] = building
        return attrs
