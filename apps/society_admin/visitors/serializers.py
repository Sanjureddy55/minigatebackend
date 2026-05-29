import logging

from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile
from apps.society_admin.flats.models import Flat

from .models import Visitor

logger = logging.getLogger(__name__)


class VisitorSerializer(serializers.ModelSerializer):
    # ── Flat hierarchy read fields ─────────────────────────────────────────────
    flat_number   = serializers.CharField(source="flat.flat_number",     read_only=True, allow_null=True)
    building_name = serializers.CharField(source="flat.building.name",   read_only=True, allow_null=True)
    society_name  = serializers.CharField(source="society.name",         read_only=True)

    # ── Choice display labels ─────────────────────────────────────────────────
    status_display     = serializers.CharField(source="get_status_display",     read_only=True)
    visit_type_display = serializers.CharField(source="get_visit_type_display", read_only=True)

    # ── Approval info ─────────────────────────────────────────────────────────
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model  = Visitor
        fields = [
            "id",
            "full_name", "mobile", "vehicle_number", "photo_url",
            "visit_type", "visit_type_display",
            "purpose", "host_name",
            "society", "society_name",
            "flat", "flat_number", "building_name",
            "status", "status_display",
            "checked_in_at", "checked_out_at",
            "approved_by", "approved_by_name",
            "rejected_reason",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "checked_in_at", "checked_out_at",
            "approved_by", "rejected_reason",
            "created_at", "updated_at",
        ]

    def validate_society(self, value: Society) -> Society:
        if value.status != Society.Status.ACTIVE:
            raise serializers.ValidationError("This society is inactive.")
        return value

    def validate_flat(self, value: Flat | None) -> Flat | None:
        return value

    def validate(self, attrs):
        society = attrs.get("society", getattr(self.instance, "society", None))
        flat    = attrs.get("flat",    getattr(self.instance, "flat",    None))
        if flat and society:
            # Ensure flat belongs to this society via building → society chain
            if flat.building.society_id != society.pk:
                raise serializers.ValidationError(
                    {"flat": "This flat does not belong to the selected society."}
                )
        return attrs


class VisitorRegisterSerializer(serializers.Serializer):
    """
    Simple visitor registration — matches the 'Register Visitor' UI form.

    Society is auto-detected from the logged-in admin.
    Flat is resolved by flat_number (e.g. 'A-402') within the admin's society.

    Fields:
      full_name, mobile, visit_type, flat_number, purpose (opt),
      host_name (opt), vehicle_number (opt)
    """

    VISIT_TYPE_CHOICES = Visitor.VisitType.choices

    full_name      = serializers.CharField(max_length=200)
    mobile         = serializers.CharField(max_length=20)
    visit_type     = serializers.ChoiceField(choices=VISIT_TYPE_CHOICES, default=Visitor.VisitType.GUEST)
    flat_number    = serializers.CharField(max_length=50, help_text="e.g. A-402")
    building_name  = serializers.CharField(max_length=200, required=False, allow_blank=True, default="",
                                           help_text="Building name e.g. 'Tower A' — narrows flat lookup")
    purpose        = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    host_name      = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    vehicle_number = serializers.CharField(max_length=20,  required=False, allow_blank=True, default="")

    def validate_mobile(self, value):
        return value.strip().replace(" ", "").replace("-", "")

    def validate(self, attrs):
        society       = self.context.get("society")
        flat_number   = attrs.get("flat_number", "").strip()
        building_name = attrs.get("building_name", "").strip()

        qs = (
            Flat.objects
            .filter(building__society=society, flat_number__iexact=flat_number)
            .select_related("building")
        )
        if building_name:
            qs = qs.filter(building__name__iexact=building_name)

        flat = qs.first()
        if not flat:
            sample = list(
                Flat.objects
                .filter(building__society=society)
                .values_list("flat_number", flat=True)[:10]
            )
            detail = f"Flat '{flat_number}'"
            if building_name:
                detail += f" in building '{building_name}'"
            raise serializers.ValidationError({
                "flat_number": (
                    f"{detail} not found in this society. "
                    f"Sample flats: {', '.join(sample)}"
                )
            })

        attrs["flat"] = flat
        return attrs


class VisitorApproveSerializer(serializers.Serializer):
    """Body for approve / reject / check-in / check-out actions."""
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class VisitorRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=1, help_text="Reason for rejection.")


class VisitorDashboardSerializer(serializers.Serializer):
    """Shape of the dashboard stats response."""
    total_today       = serializers.IntegerField()
    currently_inside  = serializers.IntegerField()
    pending_approval  = serializers.IntegerField()
    rejected_today    = serializers.IntegerField()
    by_visit_type     = serializers.ListField(child=serializers.DictField())
