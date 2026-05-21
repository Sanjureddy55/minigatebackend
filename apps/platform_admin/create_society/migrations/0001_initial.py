import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Society",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Unique display name of the society.",
                        max_length=255,
                        unique=True,
                    ),
                ),
                ("city", models.CharField(max_length=100)),
                (
                    "total_flats",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Expected number of flats (not enforced at DB level).",
                    ),
                ),
                (
                    "plan",
                    models.CharField(
                        choices=[
                            ("free", "Free"),
                            ("pro", "Pro"),
                            ("enterprise", "Enterprise"),
                        ],
                        default="free",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Active"), ("inactive", "Inactive")],
                        default="active",
                        max_length=20,
                    ),
                ),
                (
                    "admin_email",
                    models.EmailField(
                        help_text="Primary contact email for this society's admin.",
                        max_length=254,
                        unique=True,
                    ),
                ),
                (
                    "society_admin",
                    models.ForeignKey(
                        blank=True,
                        help_text="Platform user who manages this society.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="administered_societies",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Society",
                "verbose_name_plural": "Societies",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="society",
            index=models.Index(fields=["status"], name="platform_ad_status_idx"),
        ),
        migrations.AddIndex(
            model_name="society",
            index=models.Index(fields=["plan"], name="platform_ad_plan_idx"),
        ),
        migrations.AddIndex(
            model_name="society",
            index=models.Index(fields=["city"], name="platform_ad_city_idx"),
        ),
    ]
