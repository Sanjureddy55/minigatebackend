import logging

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

from .models import Module, ModulePermission, Role, UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()

HARDCODED_PASSWORD = "123456"


# ── Module Permission ─────────────────────────────────────────────────────────

class ModulePermissionSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source="get_module_display", read_only=True)

    class Meta:
        model  = ModulePermission
        fields = ["id", "module", "module_display", "can_view", "can_create", "can_edit", "can_delete"]


# ── Role ──────────────────────────────────────────────────────────────────────

class RoleSerializer(serializers.ModelSerializer):
    module_permissions = ModulePermissionSerializer(many=True, required=False)
    role_type_display  = serializers.CharField(source="get_role_type_display", read_only=True)
    user_count         = serializers.SerializerMethodField()
    available_modules  = serializers.SerializerMethodField()

    class Meta:
        model  = Role
        fields = [
            "id", "name", "slug", "role_type", "role_type_display",
            "description", "is_active", "system_role",
            "module_permissions", "user_count", "available_modules",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "system_role", "created_at", "updated_at"]

    def get_user_count(self, obj) -> int:
        return obj.users.filter(status=UserProfile.Status.ACTIVE).count()

    def get_available_modules(self, _obj) -> list:
        return [{"value": v, "label": str(l)} for v, l in Module.choices]

    def validate_name(self, value: str) -> str:
        qs = Role.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return value.strip()

    def create(self, validated_data: dict) -> Role:
        permissions_data = validated_data.pop("module_permissions", [])
        validated_data["slug"] = slugify(validated_data["name"])
        role = Role.objects.create(**validated_data)
        for perm in permissions_data:
            ModulePermission.objects.create(role=role, **perm)
        logger.info("ROLE created | id=%s name='%s'", role.pk, role.name)
        return role

    def update(self, instance: Role, validated_data: dict) -> Role:
        if instance.system_role and validated_data.get("is_active") is False:
            raise serializers.ValidationError("System roles cannot be deactivated via API.")
        permissions_data = validated_data.pop("module_permissions", None)
        if "name" in validated_data:
            validated_data["slug"] = slugify(validated_data["name"])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permissions_data is not None:
            instance.module_permissions.all().delete()
            for perm in permissions_data:
                ModulePermission.objects.create(role=instance, **perm)
        logger.info("ROLE updated | id=%s name='%s'", instance.pk, instance.name)
        return instance


# ── Assign User to Role ───────────────────────────────────────────────────────

class AssignUserSerializer(serializers.ModelSerializer):
    """
    Creates a Django User + UserProfile with hardcoded password 123456.
    POST /api/roles-permissions/roles/{id}/assign-user/
    """

    email    = serializers.EmailField(write_only=True)
    password = serializers.CharField(read_only=True)

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "email", "mobile",
            "status", "description", "password",
            "role", "society", "flat_number", "created_at",
        ]
        read_only_fields = ["id", "created_at", "password"]
        extra_kwargs = {
            "role":    {"required": False},
            "society": {"required": False},
        }

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_mobile(self, value: str) -> str:
        if UserProfile.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("This mobile number is already registered.")
        return value

    def create(self, validated_data: dict) -> UserProfile:
        from .email_utils import send_welcome_email

        email    = validated_data.pop("email")
        base     = email.split("@")[0]
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
        profile = UserProfile.objects.create(user=user, **validated_data)

        logger.info("USER_ASSIGNED | profile_id=%s email=%s role=%s", profile.pk, email, profile.role)

        send_welcome_email(email=email, full_name=profile.full_name,
                           password=HARDCODED_PASSWORD, role=profile.role)

        profile._dispatched_password = HARDCODED_PASSWORD
        return profile

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["password"] = getattr(instance, "_dispatched_password", HARDCODED_PASSWORD)
        return rep


# ── Super Admin One-Shot Setup ────────────────────────────────────────────────

class SuperAdminSetupSerializer(serializers.Serializer):
    """
    Creates the Super Admin role (if not exists) + one Super Admin user.
    Password is hardcoded to 123456. OTP is hardcoded to 123456.
    POST /api/roles-permissions/setup-super-admin/
    """

    full_name = serializers.CharField(max_length=200)
    email     = serializers.EmailField()
    mobile    = serializers.CharField(max_length=20)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_mobile(self, value: str) -> str:
        if UserProfile.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("This mobile number is already registered.")
        return value

    def create(self, validated_data: dict) -> dict:
        from .email_utils import send_welcome_email

        # ── 1. Get or create Super Admin role with all permissions ─────────
        role, role_created = Role.objects.get_or_create(
            slug="super-admin",
            defaults={
                "name":        "Super Admin",
                "role_type":   "admin",
                "description": "Full access to all modules across the platform.",
                "system_role": True,
                "is_active":   True,
            },
        )
        if role_created:
            for module_value, _ in Module.choices:
                ModulePermission.objects.create(
                    role=role, module=module_value,
                    can_view=True, can_create=True, can_edit=True, can_delete=True,
                )
            logger.info("SUPER_ADMIN_ROLE created | id=%s", role.pk)

        # ── 2. Create Django User with hardcoded password ──────────────────
        base = validated_data["email"].split("@")[0]
        username, n = base, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
            n += 1

        user = User.objects.create_user(
            username=username,
            email=validated_data["email"],
            password=HARDCODED_PASSWORD,
            first_name=validated_data["full_name"].split()[0],
            is_staff=True,
            is_superuser=True,
        )

        # ── 3. Create UserProfile ──────────────────────────────────────────
        profile = UserProfile.objects.create(
            user=user,
            role=role,
            full_name=validated_data["full_name"],
            mobile=validated_data["mobile"],
            status=UserProfile.Status.ACTIVE,
            description="Platform Super Administrator",
        )

        logger.info("SUPER_ADMIN_USER created | profile_id=%s email=%s", profile.pk, validated_data["email"])

        send_welcome_email(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=HARDCODED_PASSWORD,
            role=role,
        )

        return {"role": role, "profile": profile, "role_created": role_created}


# ── UserProfile Read / Update ─────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    email              = serializers.EmailField(source="user.email", read_only=True)
    username           = serializers.CharField(source="user.username", read_only=True)
    role_name          = serializers.CharField(source="role.name", read_only=True, allow_null=True)
    role_type          = serializers.CharField(source="role.role_type", read_only=True, allow_null=True)
    module_permissions = ModulePermissionSerializer(
        source="role.module_permissions", many=True, read_only=True
    )

    class Meta:
        model  = UserProfile
        fields = [
            "id", "username", "email", "full_name", "mobile",
            "status", "description", "role", "role_name", "role_type",
            "society", "flat_number", "module_permissions",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
