from django.db import models
from django.utils.translation import gettext_lazy as _


class Vendor(models.Model):

    class Category(models.TextChoices):
        WATER_TANKER = "water_tanker",  _("Water Tanker")
        LANDSCAPING  = "landscaping",   _("Landscaping")
        PLUMBING     = "plumbing",      _("Plumbing")
        ELECTRICAL   = "electrical",    _("Electrical")
        SECURITY     = "security",      _("Security Agency")
        CLEANING     = "cleaning",      _("Cleaning")
        LIFT         = "lift",          _("Lift Maintenance")
        PEST         = "pest",          _("Pest Control")
        OTHER        = "other",         _("Other")

    class Status(models.TextChoices):
        ACTIVE          = "active",          _("Active")
        PENDING_RENEWAL = "pending_renewal",  _("Pending Renewal")
        INACTIVE        = "inactive",         _("Inactive")

    society          = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="vendors",
    )
    name             = models.CharField(max_length=255)
    category         = models.CharField(max_length=20, choices=Category.choices)
    contact_name     = models.CharField(max_length=200, blank=True, default="")
    contact_phone    = models.CharField(max_length=20)
    contact_email    = models.EmailField(blank=True, default="")
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    contract_start   = models.DateField(null=True, blank=True)
    contract_end     = models.DateField(null=True, blank=True)
    monthly_cost     = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes            = models.TextField(blank=True, default="")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_vendors"
        ordering  = ["name"]
        indexes   = [
            models.Index(fields=["society"],  name="vendor_society_idx"),
            models.Index(fields=["status"],   name="vendor_status_idx"),
            models.Index(fields=["category"], name="vendor_category_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()}) — {self.get_status_display()}"
