from rest_framework import serializers

from .models import SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for a subscription plan.

    Read-only computed fields injected by the view:
      tenants       — count of societies currently on this plan
      total_flats   — sum of total_flats for those societies

    Derived display fields:
      price_display  — "₹4,999/mo" | "Free" | "Custom"
      annual_savings — (monthly_price * 12) - annual_price
      status_display — "Active" | "Inactive"
    """

    # Injected by view after query (not DB-annotated)
    tenants       = serializers.IntegerField(read_only=True, default=0)
    total_flats   = serializers.IntegerField(read_only=True, default=0)

    price_display  = serializers.SerializerMethodField()
    annual_savings = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model  = SubscriptionPlan
        fields = [
            "id",
            "name", "slug", "description",
            "is_popular", "is_trial", "is_custom_pricing",
            "monthly_price", "annual_price",
            "price_display", "annual_savings",
            "max_flats", "max_users", "max_buildings", "max_staff",
            "features",
            "status", "status_display",
            "sort_order",
            "tenants", "total_flats",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_price_display(self, obj) -> str:
        if obj.is_custom_pricing:
            return "Custom"
        if float(obj.monthly_price) == 0:
            return "Free"
        price = int(obj.monthly_price)
        formatted = f"{price:,}".replace(",", ",")
        return f"₹{formatted}/mo"     # ₹X,XXX/mo

    def get_annual_savings(self, obj) -> float:
        if obj.is_custom_pricing:
            return 0.0
        return round(float(obj.monthly_price) * 12 - float(obj.annual_price), 2)

    def get_status_display(self, obj) -> str:
        return obj.get_status_display()

    def validate_slug(self, value):
        return value.lower().replace(" ", "-")


class SubscriptionPlanStatsSerializer(serializers.Serializer):
    """
    Platform-level KPIs shown as cards on the Subscription Plans page.

    Cards in UI:
      MRR          — monthly recurring revenue from active paid subscriptions
      active_plans — count of active subscription plans
      trial        — societies currently on a trial/free plan
      churn_90d    — % of societies that became inactive in the last 90 days
    """
    mrr           = serializers.DecimalField(max_digits=14, decimal_places=2)
    active_plans  = serializers.IntegerField()
    trial         = serializers.IntegerField()     # societies on trial/free plans
    churn_90d     = serializers.FloatField()       # % churn in last 90 days
    total_plans   = serializers.IntegerField()
    plan_breakdown = serializers.ListField(child=serializers.DictField())
