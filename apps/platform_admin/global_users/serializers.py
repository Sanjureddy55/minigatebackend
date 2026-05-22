import random
import string

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import Role, UserProfile

User = get_user_model()


# ── Read serializers ───────────────────────────────────────────────────────────

class GlobalUserSerializer(serializers.ModelSerializer):
    """One row in the Global Users table: NAME | ROLE | SOCIETY | STATUS"""
    email          = serializers.EmailField(source="user.email",    read_only=True)
    role_name      = serializers.CharField(source="role.name",      read_only=True, allow_null=True)
    society_name   = serializers.CharField(source="society.name",   read_only=True, allow_null=True)
    status_display = serializers.SerializerMethodField()
    role_type      = serializers.CharField(source="role.role_type", read_only=True, allow_null=True)

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "email", "mobile",
            "role", "role_name", "role_type",
            "society", "society_name",
            "flat_number",
            "status", "status_display",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_status_display(self, obj) -> str:
        return {
            UserProfile.Status.ACTIVE:   "Active",
            UserProfile.Status.INACTIVE: "Suspended",
            UserProfile.Status.PENDING:  "Pending",
        }.get(obj.status, obj.status.title())


class GlobalUserStatsSerializer(serializers.Serializer):
    """3 KPI cards on the Global Users page."""
    total_users = serializers.IntegerField()
    active      = serializers.IntegerField()
    suspended   = serializers.IntegerField()
    pending     = serializers.IntegerField()


# ── Write serializers ──────────────────────────────────────────────────────────

def _gen_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(random.choices(chars, k=length))


class InviteUserSerializer(serializers.Serializer):
    """
    POST /invite/

    Platform admin creates any user directly — no OTP, status=ACTIVE by default.
    Works for resident, society_admin, security_guard, or any role.
    Password is auto-generated if not provided and returned once in the response.
    """
    full_name   = serializers.CharField(max_length=200)
    email       = serializers.EmailField()
    mobile      = serializers.CharField(max_length=20)
    role_id     = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.filter(is_active=True),
        required=False, allow_null=True,
    )
    society_id  = serializers.PrimaryKeyRelatedField(
        queryset=Society.objects.all(),
        required=False, allow_null=True,
    )
    flat_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    password    = serializers.CharField(
        max_length=128, required=False, allow_blank=True, default="",
        write_only=True,
        help_text="Leave blank to auto-generate.",
    )
    status = serializers.ChoiceField(
        choices=UserProfile.Status.choices,
        default=UserProfile.Status.ACTIVE,
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_mobile(self, value):
        if UserProfile.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("A profile with this mobile already exists.")
        return value

    def create(self, validated_data):
        full_name   = validated_data["full_name"]
        email       = validated_data["email"]
        mobile      = validated_data["mobile"]
        role        = validated_data.get("role_id")
        society     = validated_data.get("society_id")
        flat_number = validated_data.get("flat_number", "")
        user_status = validated_data.get("status", UserProfile.Status.ACTIVE)
        password    = validated_data.get("password") or _gen_password()

        base = email.split("@")[0]
        username, n = base, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}_{n}"
            n += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name.split()[0],
            last_name=" ".join(full_name.split()[1:]),
        )

        profile = UserProfile.objects.create(
            user=user,
            full_name=full_name,
            mobile=mobile,
            role=role,
            society=society,
            flat_number=flat_number,
            status=user_status,
            raw_password=password,
        )
        profile._plain_password = password
        return profile


class UpdateUserSerializer(serializers.ModelSerializer):
    """PATCH /<id>/ — update role, society, status, flat_number."""
    class Meta:
        model  = UserProfile
        fields = ["role", "society", "flat_number", "status", "description"]
