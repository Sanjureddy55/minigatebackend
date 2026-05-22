import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("society_admin_buildings", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Flat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("flat_number", models.CharField(max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("building", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="flats",
                    to="society_admin_buildings.building",
                )),
            ],
            options={"app_label": "society_admin_flats", "ordering": ["building__name", "flat_number"]},
        ),
        migrations.AddConstraint(
            model_name="flat",
            constraint=models.UniqueConstraint(fields=["building", "flat_number"], name="flat_building_number_uniq"),
        ),
        migrations.AddIndex(
            model_name="flat",
            index=models.Index(fields=["building"], name="flat_building_idx"),
        ),
    ]
