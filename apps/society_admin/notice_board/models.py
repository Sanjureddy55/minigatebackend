import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class Notice(models.Model):

    class Category(models.TextChoices):
        NOTICE       = "notice",      _("Notice")
        EVENT        = "event",       _("Event")
        FUNDRAISER   = "fundraiser",  _("Fundraiser")
        MAINTENANCE  = "maintenance", _("Maintenance Alert")

    class Audience(models.TextChoices):
        ALL     = "all",    _("All Residents")
        TOWER   = "tower",  _("Specific Tower")
        OWNERS  = "owners", _("Owners Only")
        CUSTOM  = "custom", _("Custom Group")

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive")
        ARCHIVED = "archived", _("Archived")

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category    = models.CharField(max_length=20, choices=Category.choices, default=Category.NOTICE)
    event_date  = models.DateField(blank=True, null=True, help_text="Relevant date for events / maintenance windows.")
    audience    = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # ── FK links ──────────────────────────────────────────────────────────────
    society    = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="notices",
    )
    building   = models.ForeignKey(
        "society_admin_buildings.Building",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notices",
        help_text="Populated when audience=tower.",
    )
    created_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_notices",
    )

    # ── Image ─────────────────────────────────────────────────────────────────
    image = models.ImageField(
        upload_to="notice_images/%Y/%m/",
        null=True, blank=True,
        help_text="Banner image for the notice/event.",
    )

    # ── Fundraiser / Event contribution fields ────────────────────────────────
    contribution_per_flat = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Fixed amount expected from each flat.",
    )
    min_contribution = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Minimum contribution per resident (flexible collection).",
    )
    max_contribution = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Maximum contribution per resident (cap).",
    )
    target_amount  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    raised_amount  = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_notice_board"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],  name="notice_society_idx"),
            models.Index(fields=["category"], name="notice_category_idx"),
            models.Index(fields=["status"],   name="notice_status_idx"),
            models.Index(fields=["audience"], name="notice_audience_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.get_category_display()}] {self.title}"


class NoticeRead(models.Model):
    """Tracks which residents have read which notices (read-receipt)."""

    notice   = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name="reads")
    resident = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="notice_reads",
    )
    read_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label       = "society_admin_notice_board"
        unique_together = [("notice", "resident")]
        ordering        = ["-read_at"]

    def __str__(self) -> str:
        return f"{self.resident} read '{self.notice.title}'"
