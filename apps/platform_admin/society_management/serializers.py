from rest_framework import serializers

from apps.platform_admin.create_society.models import Society


class SocietyManagementSerializer(serializers.ModelSerializer):
    """
    Society Management table row.
    Columns: Society | City | Flats | Plan | Status | actions (...)
    """
    city_name      = serializers.CharField(source="city.name",         read_only=True, allow_null=True)
    plan_display   = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    flat_count     = serializers.IntegerField(read_only=True)   # annotated by view

    class Meta:
        model  = Society
        fields = [
            "id", "name",
            "city", "city_name",
            "total_flats", "flat_count",
            "plan", "plan_display",
            "status", "status_display",
            "admin_email",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_plan_display(self, obj) -> str:
        return {
            Society.Plan.FREE:       "Free",
            Society.Plan.PRO:        "Pro",
            Society.Plan.ENTERPRISE: "Enterprise",
        }.get(obj.plan, obj.get_plan_display())

    def get_status_display(self, obj) -> str:
        return {
            Society.Status.ACTIVE:    "Active",
            Society.Status.PENDING:   "Pending",
            Society.Status.SUSPENDED: "Suspended",
            Society.Status.INACTIVE:  "Inactive",
        }.get(obj.status, obj.status.title())


class SocietyManagementStatsSerializer(serializers.Serializer):
    """4 KPI cards: Total | Active | Pending | Suspended"""
    total     = serializers.IntegerField()
    active    = serializers.IntegerField()
    pending   = serializers.IntegerField()
    suspended = serializers.IntegerField()
    inactive  = serializers.IntegerField()


class CreateSocietySerializer(serializers.ModelSerializer):
    """
    POST / — create a new society.
    city_name is read-only (computed), city is writable FK id.
    """
    city_name      = serializers.CharField(source="city.name", read_only=True, allow_null=True)
    plan_display   = serializers.CharField(source="get_plan_display",   read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Society
        fields = [
            "id", "name",
            "city", "city_name",
            "total_flats",
            "plan", "plan_display",
            "status", "status_display",
            "admin_email",
            "society_admin",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "society_admin": {"required": False, "allow_null": True},
            "status":        {"default": Society.Status.PENDING},
        }

    def validate_name(self, value):
        qs = Society.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A society with this name already exists.")
        return value.strip()

    def validate_admin_email(self, value):
        qs = Society.objects.filter(admin_email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This email is already used by another society.")
        return value.lower()
