from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Country",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",       models.CharField(max_length=100, unique=True)),
                ("code",       models.CharField(help_text="ISO 3166-1 alpha-2/3", max_length=3, unique=True)),
                ("phone_code", models.CharField(help_text="e.g. +91", max_length=10)),
                ("is_active",  models.BooleanField(default=True)),
            ],
            options={"verbose_name_plural": "Countries", "ordering": ["name"], "app_label": "accounts"},
        ),
        migrations.CreateModel(
            name="City",
            fields=[
                ("id",        models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("country",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cities", to="accounts.country")),
                ("name",      models.CharField(max_length=100)),
                ("state",     models.CharField(blank=True, default="", max_length=100)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"], "app_label": "accounts"},
        ),
        migrations.AlterUniqueTogether(
            name="city",
            unique_together={("country", "name")},
        ),
        migrations.CreateModel(
            name="OTPRecord",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("mobile",      models.CharField(db_index=True, max_length=20)),
                ("otp_code",    models.CharField(max_length=10)),
                ("is_verified", models.BooleanField(default=False)),
                ("attempts",    models.PositiveSmallIntegerField(default=0, help_text="Number of failed verification attempts for this OTP.")),
                ("expires_at",  models.DateTimeField()),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"], "app_label": "accounts"},
        ),
    ]
