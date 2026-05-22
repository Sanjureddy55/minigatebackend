from rest_framework import serializers

from .models import Society


class SocietySerializer(serializers.ModelSerializer):
    # Human-readable labels derived from TextChoices — always in sync with the model.
    plan_display   = serializers.CharField(source="get_plan_display",   read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    # City name for table display
    city_name = serializers.CharField(source="city.name", read_only=True, allow_null=True)

    # Convenience read-only field; avoids a second query when FKs are select_related.
    society_admin_email = serializers.EmailField(
        source="society_admin.email", read_only=True, allow_null=True
    )

    # Dynamic choice lists — frontend can render dropdowns without hardcoding.
    plan_choices = serializers.SerializerMethodField()
    status_choices = serializers.SerializerMethodField()

    class Meta:
        model = Society
        fields = [
            "id",
            "name",
            "city", "city_name",
            "total_flats",
            "plan",
            "plan_display",
            "plan_choices",
            "status",
            "status_display",
            "status_choices",
            "admin_email",
            "society_admin",
            "society_admin_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "society_admin": {"required": False, "allow_null": True},
        }

    # ── Dynamic choice helpers ────────────────────────────────────────────────

    def get_plan_choices(self, obj) -> list[dict]:
        return [{"value": v, "label": str(l)} for v, l in Society.Plan.choices]

    def get_status_choices(self, obj) -> list[dict]:
        return [{"value": v, "label": str(l)} for v, l in Society.Status.choices]

    # ── Field-level validators ────────────────────────────────────────────────

    def validate_name(self, value: str) -> str:
        qs = Society.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A society with this name already exists."
            )
        return value.strip()

    def validate_admin_email(self, value: str) -> str:
        qs = Society.objects.filter(admin_email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This email is already used as a society admin email."
            )
        return value.lower()

    def validate_total_flats(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Total flats cannot be negative.")
        return value

    def validate_society_admin(self, user):
        if user is not None and not user.is_active:
            raise serializers.ValidationError(
                "The assigned user account is inactive."
            )
        return user

    # ── Cross-field validation ────────────────────────────────────────────────

    def validate(self, attrs: dict) -> dict:
        # Guard: if admin_email is provided and society_admin is also provided,
        # warn when they belong to different accounts (non-blocking, informational).
        # Full enforcement can be added here once accounts app has a profile model.
        return attrs
