"""
Management command: seed_delivery_guest
Seeds Delivery Partner and Guest User accounts + sample data.

Usage:
    python manage.py seed_delivery_guest --settings=config.settings.development

Accounts created:
    Mobile 9000000020 — Priya Sharma (Delivery Partner), society=Greenwood Heights, password=Admin@1234
    Mobile 9000000030 — Rahul Guest  (Guest User),       society=Greenwood Heights, password=Admin@1234
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = "Seed Delivery Partner and Guest User test accounts with sample data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("-- Seeding Delivery Partner + Guest User data --"))

        society = self._get_society()
        if not society:
            self.stdout.write(self.style.ERROR("Society 'Greenwood Heights' not found. Run seed_data first."))
            return

        dp_profile = self._seed_delivery_partner(society)
        gu_profile = self._seed_guest_user(society)
        self._seed_deliveries(dp_profile, society)
        self._seed_access_passes(dp_profile, gu_profile, society)

        self.stdout.write(self.style.SUCCESS("\nSeed complete.\n"))
        self._print_accounts()

    # ──────────────────────────────────────────────────────────────────────────

    def _log(self, msg):
        self.stdout.write(f"  {msg}")

    def _make_user(self, email, full_name, mobile, password="Admin@1234"):
        user, created = User.objects.get_or_create(
            username=mobile,
            defaults={"email": email, "first_name": full_name.split()[0]},
        )
        if created:
            user.set_password(password)
            user.save()
        return user, created

    def _get_society(self):
        from apps.platform_admin.create_society.models import Society
        return Society.objects.filter(name="Greenwood Heights").first()

    # ──────────────────────────────────────────────────────────────────────────
    # Delivery Partner
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_delivery_partner(self, society):
        from apps.roles_permissions.models import Role, RoleType, UserProfile

        dp_role, _ = Role.objects.get_or_create(
            slug="delivery-partner",
            defaults={
                "name":        "Delivery Partner",
                "role_type":   RoleType.EXTERNAL,
                "system_role": True,
                "description": "Delivery partner — manages package deliveries",
            },
        )

        user, created = self._make_user(
            "delivery@minigate.in", "Priya Sharma", "9000000020"
        )
        profile, _ = UserProfile.objects.get_or_create(
            mobile="9000000020",
            defaults={
                "user":      user,
                "full_name": "Priya Sharma",
                "mobile":    "9000000020",
                "role":      dp_role,
                "society":   society,
                "status":    UserProfile.Status.ACTIVE,
            },
        )
        if profile.role_id != dp_role.pk:
            profile.role = dp_role
            profile.save(update_fields=["role"])
        if profile.society_id != society.pk:
            profile.society = society
            profile.save(update_fields=["society"])

        self._log(f"Delivery Partner: 9000000020 / Admin@1234  profile={profile.pk}")
        return profile

    # ──────────────────────────────────────────────────────────────────────────
    # Guest User
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_guest_user(self, society):
        from apps.roles_permissions.models import Role, RoleType, UserProfile

        gu_role, _ = Role.objects.get_or_create(
            slug="guest-user",
            defaults={
                "name":        "Guest User",
                "role_type":   RoleType.EXTERNAL,
                "system_role": True,
                "description": "Temporary guest with access pass",
            },
        )

        user, created = self._make_user(
            "guest@minigate.in", "Rahul Guest", "9000000030"
        )
        profile, _ = UserProfile.objects.get_or_create(
            mobile="9000000030",
            defaults={
                "user":      user,
                "full_name": "Rahul Guest",
                "mobile":    "9000000030",
                "role":      gu_role,
                "society":   society,
                "status":    UserProfile.Status.ACTIVE,
            },
        )
        if profile.role_id != gu_role.pk:
            profile.role = gu_role
            profile.save(update_fields=["role"])
        if profile.society_id != society.pk:
            profile.society = society
            profile.save(update_fields=["society"])

        self._log(f"Guest User:       9000000030 / Admin@1234  profile={profile.pk}")
        return profile

    # ──────────────────────────────────────────────────────────────────────────
    # Deliveries
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_deliveries(self, dp_profile, society):
        from apps.delivery_partner.delivery_requests.models import Delivery

        delivery_defs = [
            # (item_name, vendor, resident, flat, status)
            ("Samsung Galaxy S24",  "Flipkart",  "Aarav Sharma",  "A-101", Delivery.Status.PENDING),
            ("Nike Running Shoes",  "Amazon",    "Diya Patel",    "B-101", Delivery.Status.PENDING),
            ("HP Laptop Bag",       "Amazon",    "Kabir Mehta",   "B-201", Delivery.Status.OUT_FOR_DELIVERY),
            ("Organic Honey Box",   "BigBasket", "Aarav Sharma",  "A-101", Delivery.Status.OUT_FOR_DELIVERY),
            ("Wireless Headphones", "Croma",     "Diya Patel",    "B-101", Delivery.Status.DELIVERED),
            ("Cotton Bedsheets",    "Myntra",    "Kabir Mehta",   "B-201", Delivery.Status.DELIVERED),
            ("Water Purifier AMC",  "Kent",      "Aarav Sharma",  "A-101", Delivery.Status.FAILED),
        ]

        now = timezone.now()
        created_count = 0
        for item_name, vendor, resident, flat_no, dlv_status in delivery_defs:
            obj, created = Delivery.objects.get_or_create(
                item_name=item_name,
                assigned_to=dp_profile,
                society=society,
                defaults={
                    "vendor_name":   vendor,
                    "resident_name": resident,
                    "flat_number":   flat_no,
                    "status":        dlv_status,
                    "delivered_at":  now if dlv_status == Delivery.Status.DELIVERED else None,
                    "picked_up_at":  now if dlv_status in (Delivery.Status.OUT_FOR_DELIVERY, Delivery.Status.DELIVERED) else None,
                    "failed_at":     now if dlv_status == Delivery.Status.FAILED else None,
                    "failure_reason": "Resident not available" if dlv_status == Delivery.Status.FAILED else "",
                },
            )
            if created:
                created_count += 1

        self._log(f"Deliveries: {created_count} created (7 total attempted)")

    # ──────────────────────────────────────────────────────────────────────────
    # Access Passes
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_access_passes(self, dp_profile, gu_profile, society):
        from apps.common.models import AccessPass

        now = timezone.now()

        # Delivery Partner — active 12hr pass
        dp_pass, dp_created = AccessPass.objects.get_or_create(
            user=dp_profile,
            status=AccessPass.Status.ACTIVE,
            defaults={
                "society":       society,
                "user_role":     AccessPass.UserRole.DELIVERY_PARTNER,
                "visitor_name":  dp_profile.full_name,
                "visitor_phone": dp_profile.mobile,
                "valid_from":    now,
                "valid_until":   now + timezone.timedelta(hours=12),
            },
        )
        action = "Created" if dp_created else "Found existing"
        self._log(f"{action} AccessPass for Delivery Partner: {dp_pass.passcode}")

        # Guest User — active 24hr pass
        gu_pass, gu_created = AccessPass.objects.get_or_create(
            user=gu_profile,
            status=AccessPass.Status.ACTIVE,
            defaults={
                "society":             society,
                "user_role":           AccessPass.UserRole.GUEST_USER,
                "visitor_name":        gu_profile.full_name,
                "visitor_phone":       gu_profile.mobile,
                "host_resident_name":  "Aarav Sharma",
                "host_flat_number":    "A-101",
                "purpose":             "Personal visit",
                "valid_from":          now,
                "valid_until":         now + timezone.timedelta(hours=24),
            },
        )
        action = "Created" if gu_created else "Found existing"
        self._log(f"{action} AccessPass for Guest User: {gu_pass.passcode}")

    # ──────────────────────────────────────────────────────────────────────────

    def _print_accounts(self):
        self.stdout.write(self.style.SUCCESS(
            "\n--- Delivery Partner & Guest User Test Accounts ---\n"
            "  Mobile: 9000000020  Password: Admin@1234\n"
            "  Role:   Delivery Partner (Priya Sharma)\n"
            "  Mobile: 9000000030  Password: Admin@1234\n"
            "  Role:   Guest User (Rahul Guest)\n"
            "---------------------------------------------------\n"
        ))
