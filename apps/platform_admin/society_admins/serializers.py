import random
import string

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import Role, UserProfile

User = get_user_model()


def _gen_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(random.choices(chars, k=length))


class SocietyAdminSerializer(serializers.ModelSerializer):
    email          = serializers.EmailField(source="user.email",       read_only=True)
    username       = serializers.CharField(source="user.username",     read_only=True)
    society_name   = serializers.CharField(source="society.name",      read_only=True, allow_null=True)
    society_plan   = serializers.CharField(source="society.plan",      read_only=True, allow_null=True)
    society_city   = serializers.CharField(source="society.city.name", read_only=True, allow_null=True)
    status_display = serializers.SerializerMethodField()

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "email", "username", "mobile",
            "society", "society_name", "society_plan", "society_city",
            "status", "status_display",
            "description",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_status_display(self, obj) -> str:
        return {
            UserProfile.Status.ACTIVE:   "Active",
            UserProfile.Status.INACTIVE: "Suspended",
            UserProfile.Status.PENDING:  "Pending",
        }.get(obj.status, obj.status.title())


class SocietyAdminStatsSerializer(serializers.Serializer):
    total     = serializers.IntegerField()
    active    = serializers.IntegerField()
    pending   = serializers.IntegerField()
    suspended = serializers.IntegerField()


class InviteSocietyAdminSerializer(serializers.Serializer):
    """
    POST /invite/
    Super Admin creates a society admin account directly.
    Admin can log in with mobile + OTP 123456.
    """
    full_name  = serializers.CharField(max_length=200)
    mobile     = serializers.CharField(max_length=20)
    email      = serializers.EmailField(required=False, allow_blank=True, default="")
    society_id = serializers.PrimaryKeyRelatedField(
        queryset=Society.objects.all(),
        required=False, allow_null=True,
    )
    password   = serializers.CharField(
        max_length=128, required=False, allow_blank=True, default="",
        write_only=True,
        help_text="Leave blank to auto-generate.",
    )

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

    def create(self, validated_data: dict) -> UserProfile:
        full_name = validated_data["full_name"]
        mobile    = validated_data["mobile"]
        email     = validated_data.get("email", "")
        society   = validated_data.get("society_id")
        password  = validated_data.get("password") or _gen_password()

        role = Role.objects.filter(slug="society-admin", is_active=True).first()

        if email:
            base = email.split("@")[0]
        else:
            base  = f"sadmin_{mobile}"
            email = f"sadmin_{mobile}@minigate.local"

        username, n = base, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
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
            status=UserProfile.Status.ACTIVE,
        )
        profile._plain_password = password
        return profile
