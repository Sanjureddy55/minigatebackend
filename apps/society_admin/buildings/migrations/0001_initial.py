"""Clean initial migration matching current Building model and DB state."""
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("platform_admin_create_society", "0001_initial"),
        ("roles_permissions", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Building",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("society", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="buildings",
                    to="platform_admin_create_society.society",
                )),
            ],
            options={
                "app_label": "society_admin_buildings",
                "ordering": ["name"],
                "unique_together": {("society", "name")},
                "indexes": [models.Index(fields=["society"], name="building_society_idx")],
            },
        ),
    ]
