from django.db import models
from django.utils.translation import gettext_lazy as _


class MaintenanceExpense(models.Model):
    """
    Society-level maintenance expense recorded by Society Admin or Accountant.

    When is_published=True, residents can see it via the Maintenance
    Transparency endpoint along with the proof document.
    """

    class Category(models.TextChoices):
        SECURITY      = "security",      _("Security Salary")
        HOUSEKEEPING  = "housekeeping",  _("Housekeeping")
        LIFT          = "lift",          _("Lift Maintenance")
        WATER         = "water",         _("Water Tanker")
        ELECTRICITY   = "electricity",   _("Electricity")
        GARDENING     = "gardening",     _("Gardening")
        REPAIRS       = "repairs",       _("Repairs")
        INSURANCE     = "insurance",     _("Insurance")
        ADMINISTRATIVE= "administrative",_("Administrative")
        OTHER         = "other",         _("Other")

    class PaymentMode(models.TextChoices):
        UPI           = "upi",           _("UPI")
        CASH          = "cash",          _("Cash")
        CHEQUE        = "cheque",        _("Cheque")
        BANK_TRANSFER = "bank_transfer", _("Bank Transfer")
        ONLINE        = "online",        _("Online")

    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="maintenance_expenses",
    )
    title        = models.CharField(max_length=255)
    category     = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    vendor_name    = models.CharField(max_length=200, blank=True, default="")
    payment_mode   = models.CharField(
        max_length=20, choices=PaymentMode.choices, default=PaymentMode.UPI, blank=True,
    )
    invoice_number = models.CharField(max_length=100, blank=True, default="", help_text="Invoice / bill reference number.")
    building_area  = models.CharField(max_length=200, blank=True, default="", help_text="Building or common area (e.g. Tower A, Common Area).")
    proof_url      = models.CharField(max_length=500, blank=True, default="", help_text="URL or filename of invoice/receipt document.")
    expense_date   = models.DateField()
    is_published   = models.BooleanField(default=False, help_text="Published expenses are visible to residents.")
    created_by   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="recorded_expenses",
    )
    notes        = models.TextField(blank=True, default="")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_maintenance_expenses"
        ordering  = ["-expense_date"]
        indexes   = [
            models.Index(fields=["society"],      name="expense_society_idx"),
            models.Index(fields=["category"],     name="expense_category_idx"),
            models.Index(fields=["is_published"], name="expense_published_idx"),
            models.Index(fields=["expense_date"], name="expense_date_idx"),
        ]

    def __str__(self):
        return f"{self.society.name} | {self.title} | Rs.{self.amount}"
