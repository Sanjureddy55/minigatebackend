"""
python manage.py seed_roles

Creates all platform system roles if they do not already exist.
Safe to run multiple times (idempotent). Useful for:
  - Fresh deployments after the DB is migrated
  - CI pipelines / Docker entrypoints
  - Recovery if roles were accidentally deleted

Roles created:
  super-admin, society-admin, resident,
  security-guard, accountant, maintenance, support-staff
"""

from django.core.management.base import BaseCommand

from apps.roles_permissions.serializers import seed_system_roles


class Command(BaseCommand):
    help = "Seed all platform system roles (idempotent)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding system roles...")
        summary = seed_system_roles()

        created = [slug for slug, was_created in summary.items() if was_created]
        existed = [slug for slug, was_created in summary.items() if not was_created]

        if created:
            for slug in created:
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created: {slug}"))
        if existed:
            for slug in existed:
                self.stdout.write(f"  — Already exists: {slug}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {len(created)} created, {len(existed)} already present."
        ))
