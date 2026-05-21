import logging

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class Module(models.TextChoices):
    RESIDENTS        = "residents",        _("Residents")
    VISITORS         = "visitors",         _("Visitors")
    APPROVALS        = "approvals",        _("Approvals")
    BILLING          = "billing",          _("Billing")
    SECURITY_ALERTS  = "security_alerts",  _("Security Alerts")
    AUDIT_LOGS       = "audit_logs",       _("Audit Logs")
    REPORTS          = "reports",          _("Reports")
    SETTINGS         = "settings",         _("Settings")
    COMPLAINTS       = "complaints",       _("Complaints")
    NOTICES          = "notices",          _("Notices")
    PAYMENTS         = "payments",         _("Payments")
    STAFF            = "staff",            _("Staff")
    VENDORS          = "vendors",          _("Vendors")
    ANALYTICS        = "analytics",        _("Analytics")
    GATE_ENTRY       = "gate_entry",       _("Gate Entry")
    VEHICLES         = "vehicles",         _("Vehicles")
    DELIVERIES       = "deliveries",       _("Deliveries")


class RoleType(models.TextChoices):
    ADMIN       = "admin",       _("Admin")
    OPERATIONAL = "operational", _("Operational")


class Role(models.Model):
    """
    Named role in the platform (e.g. Society Admin, Security Guard).

    system_role=True means it ships with the product and cannot be deleted
    by any user — only deactivated.
    """

    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=120, unique=True)
    role_type   = models.CharField(max_length=20, choices=RoleType.choices, default=RoleType.OPERATIONAL)
    description = models.TextField(blank=True, default="")
    is_active   = models.BooleanField(default=True)
    system_role = models.BooleanField(
        default=False,
        help_text="System roles ship with the product and cannot be deleted.",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label  = "roles_permissions"
        ordering   = ["name"]
        verbose_name        = "Role"
        verbose_name_plural = "Roles"

    def __str__(self) -> str:
        return self.name


class ModulePermission(models.Model):
    """
    Fine-grained module access for a role — one row per module per role.
    All four CRUD flags default to False; Super Admin grants them explicitly.
    """

    role       = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="module_permissions")
    module     = models.CharField(max_length=50, choices=Module.choices)
    can_view   = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit   = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        app_label      = "roles_permissions"
        unique_together = [("role", "module")]
        verbose_name        = "Module Permission"
        verbose_name_plural = "Module Permissions"

    def __str__(self) -> str:
        flags = "/".join(f for f, v in [("V", self.can_view), ("C", self.can_create),
                                         ("E", self.can_edit), ("D", self.can_delete)] if v)
        return f"{self.role.name} | {self.module} | [{flags or '—'}]"


class UserProfile(models.Model):
    """
    Extended profile for every platform user.

    Wraps Django's built-in User with role assignment, mobile, and
    the society/flat the user belongs to (nullable until onboarding).
    """

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive")

    user      = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role      = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    full_name    = models.CharField(max_length=200)
    mobile       = models.CharField(max_length=20, unique=True)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    # Society / flat assigned during onboarding (nullable until then)
    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="user_profiles",
    )
    flat_number  = models.CharField(max_length=20, blank=True, default="")
    # Human-readable note for admin (e.g. "Manages Block-B accounts")
    description  = models.TextField(blank=True, default="")
    # Random password generated on creation — stored plaintext here only until
    # the welcome email is sent, then cleared for security.
    raw_password = models.CharField(
        max_length=64, blank=True, default="",
        help_text="Cleared after welcome email is dispatched.",
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        app_label  = "roles_permissions"
        ordering   = ["-created_at"]
        verbose_name        = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self) -> str:
        return f"{self.full_name} ({self.mobile})"
