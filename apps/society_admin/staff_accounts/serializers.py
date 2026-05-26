import logging

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.roles_permissions.models import Role, UserProfile

logger = logging.getLogger(__name__)
User   = get_user_model()

HARDCODED_PASSWORD = "123456"

# Roles a Society Admin is allowed to create accounts for.
# Society Admin and Super Admin accounts are managed at the platform level.
# Residents self-register via the onboarding flow.
STAFF_ROLE_SLUGS = {
    "security-guard":    "Security Guard",
    "accountant":        "Accountant",
    "maintenance-staff": "Maintenance Staff",
    "support-staff":     "Support Staff",
    "delivery-partner":  "Delivery Partner",
    "guest-user":        "Guest User",
}


class StaffAccountCreateSerializer(serializers.Serializer):
    """
    Society Admin creates a login account for a staff member in their society.
    Email is optional — staff log in with mobile + OTP 123456.
    """
    full_name    = serializers.CharField(max_length=200)
    email        = serializers.EmailField(required=False, allow_blank=True, default="")
    mobile       = serializers.CharField(max_length=20)
    role_slug    = serializers.ChoiceField(
        choices=[(slug, label) for slug, label in STAFF_ROLE_SLUGS.items()],
        help_text="Role for this account: security-guard | accountant | maintenance | support-staff",
    )
    description  = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value: str) -> str:
        if not value:
            return value
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_mobile(self, value: str) -> str:
        if UserProfile.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("This mobile number is already registered.")
        return value

    def validate_role_slug(self, value: str) -> str:
        if value not in STAFF_ROLE_SLUGS:
            raise serializers.ValidationError(
                f"Invalid role. Allowed: {', '.join(STAFF_ROLE_SLUGS.keys())}"
            )
        return value

    def create(self, validated_data: dict) -> UserProfile:
        society   = validated_data.pop("society")
        role_slug = validated_data.pop("role_slug")
        email     = validated_data.pop("email", "")
        mobile    = validated_data.get("mobile", "")

        role = Role.objects.filter(slug=role_slug, is_active=True).first()
        if not role:
            raise serializers.ValidationError(
                {"role_slug": f"Role '{role_slug}' is not configured on this platform."}
            )

        # Use email prefix as username base; fall back to mobile number
        if email:
            base = email.split("@")[0]
        else:
            base = f"staff_{mobile}"
            email = f"staff_{mobile}@minigate.local"

        username, n = base, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
            n += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=HARDCODED_PASSWORD,
            first_name=validated_data.get("full_name", "").split()[0],
        )
        profile = UserProfile.objects.create(
            user=user,
            role=role,
            society=society,
            status=UserProfile.Status.ACTIVE,
            **validated_data,
        )

        logger.info(
            "STAFF_ACCOUNT_CREATE | profile_id=%s mobile=%s role=%s society=%s",
            profile.pk, mobile, role_slug, society.pk,
        )

        profile._dispatched_password = HARDCODED_PASSWORD
        return profile


class StaffAccountSerializer(serializers.ModelSerializer):
    """Read serializer for staff UserProfile records."""
    email         = serializers.EmailField(source="user.email",   read_only=True)
    username      = serializers.CharField(source="user.username", read_only=True)
    role_slug     = serializers.CharField(source="role.slug",     read_only=True, allow_null=True)
    role_name     = serializers.CharField(source="role.name",     read_only=True, allow_null=True)
    society_name  = serializers.CharField(source="society.name",  read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = UserProfile
        fields = [
            "id", "username", "email",
            "full_name", "mobile",
            "role_slug", "role_name",
            "society", "society_name",
            "status", "status_display",
            "description",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StaffAccountUpdateSerializer(serializers.ModelSerializer):
    """Partial update — only editable fields."""
    class Meta:
        model  = UserProfile
        fields = ["full_name", "mobile", "description", "status"]
