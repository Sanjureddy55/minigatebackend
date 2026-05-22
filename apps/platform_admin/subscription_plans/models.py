from django.db import models
from django.utils.translation import gettext_lazy as _


class SubscriptionPlan(models.Model):
    """
    Platform-level subscription plan (Free / Pro / Enterprise etc.).

    slug must match Society.plan values so we can annotate society counts
    without adding a FK to the Society model.
    """

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive")

    # ── Identity ──────────────────────────────────────────────────────────────
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=50, unique=True,
                                   help_text="Matches Society.plan value (e.g. free, pro, enterprise).")
    description = models.TextField(blank=True, default="")
    is_popular  = models.BooleanField(default=False, help_text="Show 'Most Popular' badge.")

    # ── Pricing ───────────────────────────────────────────────────────────────
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    annual_price  = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── Limits (None = unlimited) ─────────────────────────────────────────────
    max_flats     = models.PositiveIntegerField(null=True, blank=True)
    max_users     = models.PositiveIntegerField(null=True, blank=True)
    max_buildings = models.PositiveIntegerField(null=True, blank=True)
    max_staff     = models.PositiveIntegerField(null=True, blank=True)

    # ── Features ──────────────────────────────────────────────────────────────
    features = models.JSONField(
        default=list,
        help_text='Array of feature strings, e.g. ["Visitor management", "24/7 support"]',
    )

    # ── Metadata ──────────────────────────────────────────────────────────────
    is_custom_pricing = models.BooleanField(
        default=False,
        help_text="If True, price shown as 'Custom' (contact sales). monthly_price is ignored for display.",
    )
    is_trial = models.BooleanField(
        default=False,
        help_text="Mark this plan as a trial/free tier for KPI tracking.",
    )
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    sort_order = models.PositiveSmallIntegerField(default=0, help_text="Display order (ascending).")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "platform_admin_subscription_plans"
        ordering  = ["sort_order", "monthly_price"]
        indexes   = [
            models.Index(fields=["slug"],   name="plan_slug_idx"),
            models.Index(fields=["status"], name="plan_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} (₹{self.monthly_price}/mo)"
