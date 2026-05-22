import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("platform_admin_create_society", "0001_initial"),
        ("roles_permissions",             "0001_initial"),
        ("society_admin_visitors",        "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApprovalRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title",       models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("category",    models.CharField(
                    choices=[("visitor","Visitor Entry"),("maintenance","Maintenance"),
                             ("move_in","Move In"),("move_out","Move Out"),
                             ("event","Society Event"),("other","Other")],
                    default="other", max_length=30,
                )),
                ("priority", models.CharField(
                    choices=[("low","Low"),("medium","Medium"),("high","High"),("urgent","Urgent")],
                    default="medium", max_length=20,
                )),
                ("stage", models.CharField(
                    choices=[("submitted","Submitted"),("under_review","Under Review"),
                             ("approved","Approved"),("rejected","Rejected"),("completed","Completed")],
                    default="submitted", max_length=30,
                )),
                ("status", models.CharField(
                    choices=[("pending","Pending"),("approved","Approved"),
                             ("rejected","Rejected"),("cancelled","Cancelled")],
                    default="pending", max_length=20,
                )),
                ("progress",       models.PositiveSmallIntegerField(default=0)),
                ("reviewer_notes", models.TextField(blank=True, default="")),
                ("reviewed_at",    models.DateTimeField(blank=True, null=True)),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                ("society",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                              related_name="approval_requests", to="platform_admin_create_society.society")),
                ("requester", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                              related_name="submitted_approvals", to="roles_permissions.userprofile")),
                ("reviewer",  models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                              related_name="reviewed_approvals", to="roles_permissions.userprofile")),
                ("visitor",   models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                              related_name="approval", to="society_admin_visitors.visitor")),
            ],
            options={"app_label": "society_admin_approvals", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="approvalrequest",
            index=models.Index(fields=["society"],  name="approval_society_idx")),
        migrations.AddIndex(model_name="approvalrequest",
            index=models.Index(fields=["status"],   name="approval_status_idx")),
        migrations.AddIndex(model_name="approvalrequest",
            index=models.Index(fields=["priority"], name="approval_priority_idx")),
        migrations.AddIndex(model_name="approvalrequest",
            index=models.Index(fields=["stage"],    name="approval_stage_idx")),
    ]
