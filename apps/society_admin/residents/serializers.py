import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import OTPRecord
from apps.resident.profile.models import FamilyMember, ResidentFlat, Vehicle
from apps.roles_permissions.models import Role, UserProfile
from apps.society_admin.buildings.models import Building
from apps.society_admin.flats.models import Flat

User = get_user_model()
logger = logging.getLogger(__name__)


# ── Read serializers ──────────────────────────────────────────────────────────

class ResidentFlatInfoSerializer(serializers.Serializer):
    """Flat + building details embedded in the resident list."""
    flat_id       = serializers.UUIDField()
    flat_number   = serializers.CharField()
    flat_display  = serializers.SerializerMethodField()
    building_name = serializers.CharField()
    is_primary    = serializers.BooleanField()
    status        = serializers.CharField()

    def get_flat_display(self, obj):
        # obj is a dict built by the view
        parts = (obj.get("building_name") or "").strip().split()
        prefix = parts[-1] if len(parts) > 1 else (parts[0] if parts else "")
        return f"{prefix}-{obj['flat_number']}" if prefix else obj["flat_number"]


class ResidentListSerializer(serializers.ModelSerializer):
    """
    Society Admin view of a resident's profile.
    Includes status, flat, building, society, role, and linked-record counts.
    """

    status_display  = serializers.CharField(source="get_status_display", read_only=True)
    role_name       = serializers.CharField(source="role.name",    read_only=True, allow_null=True)
    role_slug       = serializers.CharField(source="role.slug",    read_only=True, allow_null=True)
    society_name    = serializers.CharField(source="society.name", read_only=True, allow_null=True)
    email           = serializers.CharField(source="user.email",   read_only=True, allow_null=True)
    joined_at       = serializers.DateTimeField(source="created_at", read_only=True)

    # Flat & building via primary ResidentFlat link
    flat_display    = serializers.SerializerMethodField()
    building_name   = serializers.SerializerMethodField()
    flat_uuid       = serializers.SerializerMethodField()
    resident_type   = serializers.SerializerMethodField()   # "owner" | "tenant"

    # Linked-record counts (matching the UI columns)
    family_count    = serializers.SerializerMethodField()
    vehicle_count   = serializers.SerializerMethodField()

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "mobile", "email",
            "status", "status_display",
            "role", "role_name", "role_slug",
            "society", "society_name",
            "flat_number", "flat_uuid", "flat_display", "building_name",
            "resident_type",
            "family_count", "vehicle_count",
            "description", "joined_at",
        ]
        read_only_fields = fields

    def _primary_rf(self, obj):
        """Return the best ResidentFlat for this profile (primary first, then any)."""
        if not hasattr(obj, "_primary_rf_cache"):
            qs = obj.resident_flats.select_related("flat__building")
            obj._primary_rf_cache = (
                qs.filter(is_primary=True).first()
                or qs.first()          # tenant: is_primary=False, fall back to first flat
            )
        return obj._primary_rf_cache

    def get_flat_display(self, obj):
        rf = self._primary_rf(obj)
        if not rf:
            return obj.flat_number or ""
        flat = rf.flat
        # flat_number already contains the block prefix (e.g. "A-201").
        # Show as "A-201 / Block A" so the UI can render flat + building together.
        building_name = flat.building.name if flat.building else ""
        return f"{flat.flat_number} / {building_name}" if building_name else flat.flat_number

    def get_building_name(self, obj):
        rf = self._primary_rf(obj)
        if rf and rf.flat and rf.flat.building:
            return rf.flat.building.name
        return ""

    def get_flat_uuid(self, obj):
        rf = self._primary_rf(obj)
        return str(rf.flat.pk) if rf else None

    def get_resident_type(self, obj):
        rf = self._primary_rf(obj)
        if rf is None:
            return "owner"
        return "owner" if rf.is_primary else "tenant"

    def get_family_count(self, obj):
        return FamilyMember.objects.filter(resident=obj).count()

    def get_vehicle_count(self, obj):
        return Vehicle.objects.filter(resident=obj).count()


# ── Write serializers ─────────────────────────────────────────────────────────

class ResidentCreateByAdminSerializer(serializers.Serializer):
    """
    Society Admin — Add Resident directly (POST /api/society-admin/residents/add/)

    Matches the "Add Resident" form in the UI:
      full_name, email, mobile, type (owner/tenant),
      building, flat_number, family_members (count), vehicles (count)

    Creates:
      • Django User  (username = mobile, password = mobile)
      • UserProfile  (role=resident, status=ACTIVE, society=admin's society)
      • ResidentFlat (status=ACTIVE, is_primary=True)
      • OTPRecord    (otp_code="123456") so resident can log in immediately
    """

    OWNER  = "owner"
    TENANT = "tenant"
    TYPE_CHOICES = [(OWNER, "Owner"), (TENANT, "Tenant")]

    full_name      = serializers.CharField(max_length=200)
    email          = serializers.EmailField(required=False, allow_blank=True, default="")
    mobile         = serializers.CharField(max_length=20)
    type           = serializers.ChoiceField(choices=TYPE_CHOICES, default=OWNER)
    building       = serializers.CharField(max_length=200)   # accepts name, e.g. "Block A"
    flat_number    = serializers.CharField(max_length=20)
    family_members = serializers.IntegerField(min_value=0, default=0, required=False)
    vehicles       = serializers.IntegerField(min_value=0, default=0, required=False)
    # Internal — injected by view so validate() can scope the building lookup
    _society       = serializers.HiddenField(default=None)

    # ── Field-level validation ────────────────────────────────────────────────

    def validate_mobile(self, value):
        value = value.strip().replace(" ", "").replace("-", "")
        if not value.lstrip("+").isdigit():
            raise serializers.ValidationError("Mobile must contain digits only.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A resident with this mobile number already exists.")
        if UserProfile.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("A profile with this mobile number already exists.")
        return value

    def validate_email(self, value):
        value = (value or "").strip()
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate(self, attrs):
        building_name = (attrs.get("building") or "").strip()
        flat_number   = (attrs.get("flat_number") or "").strip()
        # society injected by view via data["_society"] or serializer context
        society = attrs.pop("_society", None) or self.context.get("society")

        # Resolve building by name within the society
        building_qs = Building.objects.filter(name__iexact=building_name)
        if society:
            building_qs = building_qs.filter(society=society)

        building_obj = building_qs.first()
        if not building_obj:
            # List available buildings to help the user
            available = list(
                Building.objects.filter(society=society).values_list("name", flat=True)
                if society else Building.objects.values_list("name", flat=True)
            )
            raise serializers.ValidationError({
                "building": (
                    f"Building '{building_name}' not found. "
                    f"Available: {', '.join(available) or 'none'}."
                )
            })

        # Ensure the flat exists in this building
        try:
            flat = Flat.objects.get(building=building_obj, flat_number=flat_number)
        except Flat.DoesNotExist:
            raise serializers.ValidationError({
                "flat_number": (
                    f"Flat '{flat_number}' does not exist in {building_obj.name}. "
                    "Check the flat number or create the flat first."
                )
            })

        attrs["building"] = building_obj   # replace name string with model instance
        attrs["flat"]     = flat
        return attrs

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, validated_data):
        """
        validated_data must include 'society' (injected by the view from
        the logged-in society admin's profile).
        """
        society = validated_data.pop("society")
        mobile  = validated_data["mobile"]
        email   = validated_data.get("email", "") or ""
        is_owner = validated_data["type"] == self.OWNER
        flat     = validated_data["flat"]

        # 1. Django User
        user = User.objects.create_user(
            username=mobile,
            email=email,
            password=mobile,          # temporary password = mobile number
        )

        # 2. Resident role
        resident_role = Role.objects.filter(slug="resident").first()

        # 3. UserProfile (ACTIVE immediately — admin is creating, no approval needed)
        profile = UserProfile.objects.create(
            user=user,
            full_name=validated_data["full_name"],
            mobile=mobile,
            role=resident_role,
            society=society,
            flat_number=validated_data["flat_number"],
            status=UserProfile.Status.ACTIVE,
        )

        # 4. ResidentFlat link — owner → is_primary=True, tenant → is_primary=False
        ResidentFlat.objects.create(
            profile=profile,
            flat=flat,
            society=society,
            is_primary=is_owner,
            status=ResidentFlat.Status.ACTIVE,
        )

        # 5. OTP record — so the resident can log in immediately with OTP 123456
        OTPRecord.objects.filter(mobile=mobile).delete()
        OTPRecord.objects.create(
            mobile=mobile,
            otp_code="123456",
            is_verified=False,
            attempts=0,
            expires_at=timezone.now() + timedelta(hours=24),
        )

        logger.info(
            "RESIDENT_CREATED_BY_ADMIN | profile=%s flat=%s society=%s by=%s",
            profile.pk, flat.pk, society.pk,
            self.context.get("request") and self.context["request"].user,
        )
        return profile, validated_data.get("family_members", 0), validated_data.get("vehicles", 0)


class ResidentApproveSerializer(serializers.Serializer):
    """Body for approve action — optional flat assignment."""
    flat_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role        = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )


class ResidentRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
