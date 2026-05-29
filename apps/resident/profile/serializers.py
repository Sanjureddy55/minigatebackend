from rest_framework import serializers

from apps.society_admin.flats.models import Flat

from .models import DailyHelp, FamilyMember, Pet, ResidentFlat, Vehicle


class ResidentFlatSerializer(serializers.ModelSerializer):
    """Read serializer — what the app shows in the flat-switcher list."""
    flat_number    = serializers.CharField(source="flat.flat_number", read_only=True)
    building_name  = serializers.CharField(source="flat.building.name", read_only=True)
    society_name   = serializers.CharField(source="society.name", read_only=True)
    city           = serializers.CharField(source="society.city.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = ResidentFlat
        fields = [
            "id", "flat", "flat_number", "building_name",
            "society", "society_name", "city",
            "is_primary", "status", "status_display",
            "created_at",
        ]
        read_only_fields = ["id", "is_primary", "status", "created_at"]


class AddFlatSerializer(serializers.Serializer):
    """Body for POST /my-flats/add/ — link a new flat to this resident."""
    society_id  = serializers.IntegerField()
    flat_number = serializers.CharField(max_length=20)

    def validate(self, data):
        from apps.platform_admin.create_society.models import Society
        try:
            society = Society.objects.get(pk=data["society_id"])
        except Society.DoesNotExist:
            raise serializers.ValidationError({"society_id": "Society not found."})

        flat = Flat.objects.filter(
            flat_number=data["flat_number"],
            building__society=society,
        ).first()
        if not flat:
            raise serializers.ValidationError(
                {"flat_number": f"Flat '{data['flat_number']}' not found in {society.name}."}
            )

        data["society"] = society
        data["flat"]    = flat
        return data


class FamilyMemberSerializer(serializers.ModelSerializer):
    relation_display = serializers.CharField(source="get_relation_display", read_only=True)

    class Meta:
        model  = FamilyMember
        fields = [
            "id", "resident", "flat",
            "name", "relation", "relation_display",
            "phone", "age", "gate_access", "photo_url",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "resident", "flat", "created_at", "updated_at"]


class VehicleSerializer(serializers.ModelSerializer):
    vehicle_type_display = serializers.CharField(source="get_vehicle_type_display", read_only=True)
    status_display       = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Vehicle
        fields = [
            "id", "resident", "flat",
            "vehicle_name", "vehicle_type", "vehicle_type_display",
            "plate_number", "color", "parking_slot",
            "status", "status_display",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "resident", "flat", "status", "created_at", "updated_at"]


class PetSerializer(serializers.ModelSerializer):
    pet_type_display = serializers.CharField(source="get_pet_type_display", read_only=True)
    gender_display   = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model  = Pet
        fields = [
            "id", "resident", "flat",
            "name", "calling_name", "pet_type", "pet_type_display",
            "breed", "gender", "gender_display", "color", "vaccinated",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "resident", "flat", "created_at", "updated_at"]


class DailyHelpSerializer(serializers.ModelSerializer):
    help_type_display = serializers.CharField(source="get_help_type_display", read_only=True)
    status_display    = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = DailyHelp
        fields = [
            "id", "resident", "flat",
            "name", "help_type", "help_type_display",
            "phone", "timing", "days",
            "upi_id", "monthly_salary", "status", "status_display",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "resident", "flat", "created_at", "updated_at"]
