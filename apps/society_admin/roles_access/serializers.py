import logging

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

from apps.roles_permissions.models import Module, ModulePermission, Role, RoleType, UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()

# ── Guard rails ────────────────────────────────────────────────────────────────
# Society Admin cannot touch these roles under any circumstances.
PROTECTED_SLUGS = frozenset(["super-admin", "society-admin"])
PROTECTED_NAMES = frozenset(["super admin", "society admin"])

# Society Admin can only assign these role types.
ALLOWED_ROLE_TYPES = frozenset([
    RoleType.OPERATIONAL,
    RoleType.RESIDENT,
    RoleType.EXTERNAL,
])

HARDCODED_PASSWORD = "123456"


def _assert_not_protected(name: str = "", slug: str = "") -> None:
    """Raise ValidationError if name/slug matches a protected role."""
    if slug.lower() in PROTECTED_SLUGS or name.lower().strip() in PROTECTED_NAMES:
        raise serializers.ValidationError(
            "Super Admin and Society Admin roles cannot be created or modified by Society Admin."
        )


# ── Module Permission (inline) ─────────────────────────────────────────────────

class SocietyModulePermissionSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source="get_module_display", read_only=True)

    class Meta:
        model  = ModulePermission
        fields = ["id", "module", "module_display", "can_view", "can_create", "can_edit", "can_delete"]
        read_only_fields = ["id"]

    def validate_module(self, value: str) -> str:
        valid = {v for v, _ in Module.choices}
        if value not in valid:
            raise serializers.ValidationError(f"Invalid module '{value}'.")
        return value


# ── Role ───────────────────────────────────────────────────────────────────────

class SocietyRoleSerializer(serializers.ModelSerializer):
    """
    Society Admin-scoped Role serializer.

    Creation / update rules enforced here:
      - Cannot touch Super Admin or Society Admin (by name or slug).
      - role_type must be operational / resident / external.
      - module_permissions are written as a nested list (full replace on update).
    """
    module_permissions = SocietyModulePermissionSerializer(many=True, required=False, default=list)
    role_type_display  = serializers.CharField(source="get_role_type_display", read_only=True)
    user_count         = serializers.SerializerMethodField()
    available_modules  = serializers.SerializerMethodField()
    available_role_types = serializers.SerializerMethodField()

    class Meta:
        model  = Role
        fields = [
            "id", "name", "slug", "role_type", "role_type_display",
            "description", "is_active", "system_role",
            "module_permissions", "user_count",
            "available_modules", "available_role_types",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "system_role", "created_at", "updated_at"]

    def get_user_count(self, obj) -> int:
        return obj.users.filter(status=UserProfile.Status.ACTIVE).count()

    def get_available_modules(self, _) -> list:
        return [{"value": v, "label": str(l)} for v, l in Module.choices]

    def get_available_role_types(self, _) -> list:
        allowed = [(v, l) for v, l in RoleType.choices if v in ALLOWED_ROLE_TYPES]
        return [{"value": v, "label": str(l)} for v, l in allowed]

    # ── Field-level validation ─────────────────────────────────────────────────

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        _assert_not_protected(name=cleaned)
        qs = Role.objects.filter(name__iexact=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return cleaned

    def validate_role_type(self, value: str) -> str:
        if value not in ALLOWED_ROLE_TYPES:
            raise serializers.ValidationError(
                f"Society Admin can only set role_type to: {', '.join(sorted(ALLOWED_ROLE_TYPES))}."
            )
        return value

    # ── Object-level validation ────────────────────────────────────────────────

    def validate(self, attrs):
        # On update, block edits to protected roles
        if self.instance:
            _assert_not_protected(
                name=self.instance.name,
                slug=self.instance.slug,
            )
            if self.instance.system_role:
                raise serializers.ValidationError(
                    "System roles cannot be modified by Society Admin."
                )
        return attrs

    # ── Write operations ───────────────────────────────────────────────────────

    def create(self, validated_data: dict) -> Role:
        permissions_data = validated_data.pop("module_permissions", [])
        validated_data["slug"] = slugify(validated_data["name"])
        role = Role.objects.create(**validated_data)
        for perm in permissions_data:
            ModulePermission.objects.create(role=role, **perm)
        logger.info(
            "SOCIETY_ROLE_CREATE | id=%s name='%s' type=%s perms=%d",
            role.pk, role.name, role.role_type, len(permissions_data),
        )
        return role

    def update(self, instance: Role, validated_data: dict) -> Role:
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
        logger.info(
            "SOCIETY_ROLE_UPDATE | id=%s name='%s' perms_replaced=%s",
            instance.pk, instance.name, permissions_data is not None,
        )
        return instance


# ── Assign user to role (Society Admin context) ────────────────────────────────

class SocietyAssignUserSerializer(serializers.ModelSerializer):
    """
    Creates a Django User + UserProfile scoped to a society.
    The role FK is injected by the view (from the URL pk).
    """
    email    = serializers.EmailField(write_only=True)
    password = serializers.CharField(read_only=True)

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "email", "mobile",
            "status", "description", "role", "society",
            "flat_number", "password", "created_at",
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
        from apps.roles_permissions.email_utils import send_welcome_email

        email = validated_data.pop("email")
        base, n = email.split("@")[0], 1
        username = base
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

        logger.info(
            "SOCIETY_ASSIGN_USER | profile_id=%s email=%s role=%s society=%s",
            profile.pk, email, profile.role_id, profile.society_id,
        )
        send_welcome_email(
            email=email,
            full_name=profile.full_name,
            password=HARDCODED_PASSWORD,
            role=profile.role,
        )
        profile._dispatched_password = HARDCODED_PASSWORD
        return profile

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["password"] = getattr(instance, "_dispatched_password", HARDCODED_PASSWORD)
        return rep


# ── Dashboard stats ────────────────────────────────────────────────────────────

class SocietyRoleDashboardSerializer(serializers.Serializer):
    total_roles       = serializers.IntegerField()
    active_roles      = serializers.IntegerField()
    total_users       = serializers.IntegerField()
    active_users      = serializers.IntegerField()
    by_role_type      = serializers.ListField(child=serializers.DictField())
    by_role           = serializers.ListField(child=serializers.DictField())
