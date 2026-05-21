from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile

from .models import City, Country, OTPRecord

User = get_user_model()


# ── OTP ───────────────────────────────────────────────────────────────────────

class SendOTPSerializer(serializers.Serializer):
    mobile = serializers.CharField(max_length=20)

    def validate_mobile(self, value: str) -> str:
        value = value.strip().replace(" ", "")
        if not value.lstrip("+").isdigit():
            raise serializers.ValidationError("Mobile must contain digits only (optionally prefixed with +).")
        return value


class VerifyOTPSerializer(serializers.Serializer):
    mobile   = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=10)


# ── Onboarding ────────────────────────────────────────────────────────────────

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Country
        fields = ["id", "name", "code", "phone_code"]


class CitySerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True)

    class Meta:
        model  = City
        fields = ["id", "name", "state", "country", "country_name"]


class SocietyLookupSerializer(serializers.ModelSerializer):
    """Lightweight Society list for onboarding city → society step."""

    class Meta:
        model  = Society
        fields = ["id", "name", "city", "total_flats", "plan", "status"]


class OnboardingCreateSerializer(serializers.Serializer):
    """
    Final onboarding step: create (or retrieve) UserProfile after OTP verified.

    The mobile must have a verified OTPRecord to pass validation.
    """

    mobile      = serializers.CharField(max_length=20)
    full_name   = serializers.CharField(max_length=200)
    country_id  = serializers.PrimaryKeyRelatedField(queryset=Country.objects.filter(is_active=True))
    city_id     = serializers.PrimaryKeyRelatedField(queryset=City.objects.filter(is_active=True))
    society_id  = serializers.PrimaryKeyRelatedField(
        queryset=Society.objects.filter(status=Society.Status.ACTIVE),
        required=False, allow_null=True,
    )
    flat_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_mobile(self, value: str) -> str:
        verified = (
            OTPRecord.objects
            .filter(mobile=value, is_verified=True)
            .order_by("-created_at")
            .exists()
        )
        if not verified:
            raise serializers.ValidationError(
                "Mobile number has not been OTP-verified. Complete OTP verification first."
            )
        return value

    def validate(self, attrs: dict) -> dict:
        city    = attrs.get("city_id")
        country = attrs.get("country_id")
        if city and country and city.country_id != country.pk:
            raise serializers.ValidationError({"city_id": "This city does not belong to the selected country."})
        return attrs

    def create(self, validated_data: dict) -> UserProfile:
        mobile     = validated_data["mobile"]
        full_name  = validated_data["full_name"]
        society    = validated_data.get("society_id")
        flat_number = validated_data.get("flat_number", "")

        # Idempotent: return existing profile if mobile already registered
        existing = UserProfile.objects.filter(mobile=mobile).first()
        if existing:
            return existing

        # Create a minimal Django User
        base = mobile.lstrip("+")
        username, n = f"user_{base}", 1
        while User.objects.filter(username=username).exists():
            username = f"user_{base}_{n}"
            n += 1

        user = User.objects.create_user(
            username=username,
            first_name=full_name.split()[0],
        )

        profile = UserProfile.objects.create(
            user=user,
            mobile=mobile,
            full_name=full_name,
            society=society,
            flat_number=flat_number,
            status=UserProfile.Status.ACTIVE,
        )
        return profile


# ── Login ─────────────────────────────────────────────────────────────────────

class EmailPasswordLoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        try:
            user_obj = User.objects.get(email__iexact=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        user = authenticate(username=user_obj.username, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs["user"] = user
        return attrs


class MobileOTPLoginSerializer(serializers.Serializer):
    mobile   = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=10)
