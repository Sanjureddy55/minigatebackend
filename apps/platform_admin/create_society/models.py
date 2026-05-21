from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Society(models.Model):
    """
    Central society record created by the platform admin.

    Flats are linked via a reverse ForeignKey from the Flat model
    (apps.society_admin.flats), keeping this model future-proof without
    storing flat detail here.
    """

    class Plan(models.TextChoices):
        FREE = "free", _("Free")
        PRO = "pro", _("Pro")
        ENTERPRISE = "enterprise", _("Enterprise")

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")

    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unique display name of the society.",
    )
    city = models.CharField(max_length=100)
    # Stores expected flat count; actual flats are tracked via Flat FK.
    total_flats = models.PositiveIntegerField(
        default=0,
        help_text="Expected number of flats (not enforced at DB level).",
    )
    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.FREE,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    # Denormalised contact email; does not have to match society_admin.email.
    admin_email = models.EmailField(
        unique=True,
        help_text="Primary contact email for this society's admin.",
    )
    # Nullable so a society can exist before a user account is provisioned.
    society_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="administered_societies",
        help_text="Platform user who manages this society.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "platform_admin_create_society"
        ordering = ["-created_at"]
        verbose_name = "Society"
        verbose_name_plural = "Societies"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["plan"]),
            models.Index(fields=["city"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.city})"
