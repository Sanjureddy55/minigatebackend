import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("platform_admin_create_society", "0001_initial"),
        ("roles_permissions",             "0001_initial"),
        ("society_admin_flats",           "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Visitor",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name",      models.CharField(max_length=200)),
                ("mobile",         models.CharField(max_length=20)),
                ("vehicle_number", models.CharField(blank=True, default="", max_length=20)),
                ("photo_url",      models.CharField(blank=True, default="", max_length=500)),
                ("visit_type",     models.CharField(
                    choices=[("guest","Guest"),("delivery","Delivery"),("cab","Cab / Taxi"),
                             ("service","Service / Maintenance"),("other","Other")],
                    default="guest", max_length=20,
                )),
                ("purpose",         models.TextField(blank=True, default="")),
                ("host_name",       models.CharField(blank=True, default="", max_length=200)),
                ("status",          models.CharField(
                    choices=[("pending","Pending Approval"),("approved","Approved"),
                             ("inside","Inside"),("exited","Exited"),("rejected","Rejected")],
                    default="pending", max_length=20,
                )),
                ("checked_in_at",   models.DateTimeField(blank=True, null=True)),
                ("checked_out_at",  models.DateTimeField(blank=True, null=True)),
                ("rejected_reason", models.TextField(blank=True, default="")),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
                ("updated_at",      models.DateTimeField(auto_now=True)),
                ("society",    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                               related_name="visitors", to="platform_admin_create_society.society")),
                ("flat",       models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                               related_name="visitors", to="society_admin_flats.flat")),
                ("approved_by",models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                               related_name="approved_visitors", to="roles_permissions.userprofile")),
            ],
            options={"app_label": "society_admin_visitors", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="visitor",
            index=models.Index(fields=["society"],    name="visitor_society_idx")),
        migrations.AddIndex(model_name="visitor",
            index=models.Index(fields=["status"],     name="visitor_status_idx")),
        migrations.AddIndex(model_name="visitor",
            index=models.Index(fields=["visit_type"], name="visitor_type_idx")),
        migrations.AddIndex(model_name="visitor",
            index=models.Index(fields=["created_at"], name="visitor_created_idx")),
    ]
