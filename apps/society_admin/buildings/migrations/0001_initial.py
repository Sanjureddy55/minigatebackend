import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("platform_admin_create_society", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Building",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("society", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="buildings",
                    to="platform_admin_create_society.society",
                )),
            ],
            options={"app_label": "society_admin_buildings", "ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="building",
            constraint=models.UniqueConstraint(fields=["society", "name"], name="building_society_name_uniq"),
        ),
        migrations.AddIndex(
            model_name="building",
            index=models.Index(fields=["society"], name="building_society_idx"),
        ),
    ]
