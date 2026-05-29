from django.db import models
from django.utils.translation import gettext_lazy as _


class ResidentFlat(models.Model):
    """
    A resident can own / occupy multiple flats across societies.
    One flat is marked is_primary=True — this is the "active" context
    used for dashboard, complaints, payments, etc.
    """

    class Status(models.TextChoices):
        PENDING  = "pending",  _("Pending Approval")
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive / Rejected")

    profile    = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="resident_flats",
    )
    flat       = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="resident_occupants",
    )
    society    = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="resident_flat_links",
    )
    is_primary = models.BooleanField(default=False)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # ── Flat profile details (editable by resident via Update Flat Profile) ────
    floor          = models.CharField(max_length=50,  blank=True, default="",
                                      help_text="e.g. '3rd Floor'")
    flat_type      = models.CharField(max_length=20,  blank=True, default="",
                                      help_text="e.g. '2 BHK', '3 BHK', 'Studio'")
    area           = models.CharField(max_length=50,  blank=True, default="",
                                      help_text="e.g. '1480 sq ft'")
    facing         = models.CharField(max_length=20,  blank=True, default="",
                                      help_text="e.g. 'East', 'West', 'North', 'South'")
    parking_slots  = models.CharField(max_length=200, blank=True, default="",
                                      help_text="e.g. 'P1-22 (Car) · B-07 (Bike)'")
    resident_since = models.DateField(null=True, blank=True,
                                      help_text="Date the resident moved in.")

    # ── Utility connections ────────────────────────────────────────────────────
    internet_connection = models.CharField(max_length=200, blank=True, default="",
                                           help_text="e.g. 'ACT Fibernet · 200 Mbps'")
    power_connection    = models.CharField(max_length=200, blank=True, default="",
                                           help_text="e.g. 'BESCOM · Meter No. 44821'")
    water_connection    = models.CharField(max_length=200, blank=True, default="",
                                           help_text="e.g. 'Borewell + BWSSB supply'")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label       = "resident_profile"
        unique_together = [("profile", "flat")]
        ordering        = ["-is_primary", "-created_at"]
        verbose_name        = "Resident Flat"
        verbose_name_plural = "Resident Flats"

    def __str__(self):
        return f"{self.profile.full_name} -> {self.flat} ({'primary' if self.is_primary else 'secondary'})"


class FamilyMember(models.Model):
    class Relation(models.TextChoices):
        FATHER  = "father",  _("Father")
        MOTHER  = "mother",  _("Mother")
        SPOUSE  = "spouse",  _("Spouse")
        CHILD   = "child",   _("Child")
        SIBLING = "sibling", _("Sibling")
        OTHER   = "other",   _("Other")

    resident  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="family_members",
    )
    flat      = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="family_members",
    )
    name        = models.CharField(max_length=200)
    relation    = models.CharField(max_length=20, choices=Relation.choices)
    phone       = models.CharField(max_length=20, blank=True, default="")
    age         = models.PositiveSmallIntegerField(null=True, blank=True,
                                                   help_text="Age in years.")
    gate_access = models.BooleanField(default=False,
                                      help_text="Whether this family member has gate access.")
    photo_url   = models.CharField(max_length=500, blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_profile"
        ordering  = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_relation_display()}) — {self.flat}"


class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        CAR_SEDAN   = "car_sedan",   _("Car (Sedan)")
        CAR_SUV     = "car_suv",     _("Car (SUV)")
        TWO_WHEELER = "two_wheeler", _("Two-Wheeler")
        OTHER       = "other",       _("Other")

    class Status(models.TextChoices):
        PENDING  = "pending",  _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    resident      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="vehicles",
    )
    flat          = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="vehicles",
    )
    vehicle_name  = models.CharField(max_length=100)
    vehicle_type  = models.CharField(max_length=20, choices=VehicleType.choices)
    plate_number  = models.CharField(max_length=20, unique=True)
    color         = models.CharField(max_length=50, blank=True, default="")
    parking_slot  = models.CharField(max_length=50, blank=True, default="")
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_profile"
        ordering  = ["vehicle_name"]

    def __str__(self):
        return f"{self.plate_number} ({self.vehicle_name})"


class Pet(models.Model):
    class PetType(models.TextChoices):
        DOG   = "dog",   _("Dog")
        CAT   = "cat",   _("Cat")
        BIRD  = "bird",  _("Bird")
        OTHER = "other", _("Other")

    class Gender(models.TextChoices):
        MALE   = "male",   _("Male")
        FEMALE = "female", _("Female")

    resident     = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="pets",
    )
    flat         = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="pets",
    )
    name         = models.CharField(max_length=100)
    calling_name = models.CharField(max_length=100, blank=True, default="")
    pet_type     = models.CharField(max_length=20, choices=PetType.choices)
    breed        = models.CharField(max_length=100, blank=True, default="")
    gender       = models.CharField(max_length=10, choices=Gender.choices, blank=True, default="")
    color        = models.CharField(max_length=50, blank=True, default="")
    vaccinated   = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_profile"
        ordering  = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_pet_type_display()})"


class DailyHelp(models.Model):
    class HelpType(models.TextChoices):
        MAID     = "maid",     _("Maid")
        COOK     = "cook",     _("Cook")
        DRIVER   = "driver",   _("Driver")
        WATCHMAN = "watchman", _("Watchman")
        OTHER    = "other",    _("Other")

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive")

    resident        = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="daily_helpers",
    )
    flat            = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="daily_helpers",
    )
    name            = models.CharField(max_length=200)
    help_type       = models.CharField(max_length=20, choices=HelpType.choices)
    upi_id          = models.CharField(max_length=100, blank=True, default="")
    monthly_salary  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_profile"
        ordering  = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_help_type_display()})"
