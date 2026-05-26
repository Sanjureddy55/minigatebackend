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


# ── System Role Seed ─────────────────────────────────────────────────────────

# All platform roles. Called once during setup-super-admin and via `seed_roles` command.
_SYSTEM_ROLES = [
    {
        "name":        "Super Admin",
        "slug":        "super-admin",
        "role_type":   "admin",
        "description": "Full access to all modules across the platform.",
        "all_perms":   True,   # grants CRUD on every module
    },
    {
        "name":        "Society Admin",
        "slug":        "society-admin",
        "role_type":   "admin",
        "description": "Manages a single society — buildings, residents, billing, approvals.",
    },
    {
        "name":        "Resident",
        "slug":        "resident",
        "role_type":   "resident",
        "description": "Flat owner / occupant of a society.",
    },
    {
        "name":        "Security Guard",
        "slug":        "security-guard",
        "role_type":   "operational",
        "description": "Gate management, visitor entry, delivery verification.",
    },
    {
        "name":        "Accountant",
        "slug":        "accountant",
        "role_type":   "operational",
        "description": "Billing, payment collection, fund management.",
    },
    {
        "name":        "Maintenance Staff",
        "slug":        "maintenance-staff",
        "role_type":   "operational",
        "description": "Handles maintenance tasks and repairs.",
    },
    {
        "name":        "Support Staff",
        "slug":        "support-staff",
        "role_type":   "operational",
        "description": "Handles resident support tickets and complaints.",
    },
]


def seed_system_roles() -> dict:
    """
    Idempotent: create all system roles if they do not already exist.
    Returns a summary dict {slug: created_bool}.
    """
    summary = {}
    for rd in _SYSTEM_ROLES:
        role, created = Role.objects.get_or_create(
            slug=rd["slug"],
            defaults={
                "name":        rd["name"],
                "role_type":   rd["role_type"],
                "description": rd["description"],
                "system_role": True,
                "is_active":   True,
            },
        )
        if created and rd.get("all_perms"):
            for module_value, _ in Module.choices:
                ModulePermission.objects.get_or_create(
                    role=role, module=module_value,
                    defaults=dict(can_view=True, can_create=True, can_edit=True, can_delete=True),
                )
            logger.info("SYSTEM_ROLE seeded | slug=%s id=%s", rd["slug"], role.pk)
        summary[rd["slug"]] = created
    return summary


# ── Super Admin One-Shot Setup ────────────────────────────────────────────────

class SuperAdminSetupSerializer(serializers.Serializer):
    """
    Idempotent first-run setup:
      1. Seeds ALL system roles (super-admin, society-admin, resident,
         security-guard, accountant, maintenance, support-staff)
      2. Creates the first Super Admin user
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
        from django.db import transaction

        from .email_utils import send_welcome_email

        with transaction.atomic():
            # ── 1. Seed all system roles atomically ────────────────────────
            seed_summary = seed_system_roles()
            role_created = seed_summary.get("super-admin", False)

            # ── 2. Fetch the super-admin role (now guaranteed to exist) ────
            role = Role.objects.get(slug="super-admin")

            # ── 3. Create Django User ──────────────────────────────────────
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

            # ── 4. Create UserProfile ──────────────────────────────────────
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
    role               = serializers.SerializerMethodField()
    society            = serializers.SerializerMethodField()
    module_permissions = ModulePermissionSerializer(
        source="role.module_permissions", many=True, read_only=True
    )

    class Meta:
        model  = UserProfile
        fields = [
            "id", "username", "email", "full_name", "mobile",
            "status", "description", "role",
            "society", "flat_number", "module_permissions",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_role(self, obj):
        r = obj.role
        if not r:
            return None
        return {
            "id":        r.pk,
            "name":      r.name,
            "slug":      r.slug,
            "role_type": r.role_type,
        }

    def get_society(self, obj):
        s = obj.society
        if not s:
            return None
        return {
            "id":   s.pk,
            "name": s.name,
            "city": s.city.name if s.city_id else None,
            "plan": s.plan,
        }
