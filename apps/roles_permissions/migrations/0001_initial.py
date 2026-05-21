from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("platform_admin_create_society", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",        models.CharField(max_length=100, unique=True)),
                ("slug",        models.SlugField(max_length=120, unique=True)),
                ("role_type",   models.CharField(choices=[("admin", "Admin"), ("operational", "Operational")], default="operational", max_length=20)),
                ("description", models.TextField(blank=True, default="")),
                ("is_active",   models.BooleanField(default=True)),
                ("system_role", models.BooleanField(default=False, help_text="System roles ship with the product and cannot be deleted.")),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",  models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Role", "verbose_name_plural": "Roles", "ordering": ["name"], "app_label": "roles_permissions"},
        ),
        migrations.CreateModel(
            name="ModulePermission",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role",       models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="module_permissions", to="roles_permissions.role")),
                ("module",     models.CharField(choices=[
                    ("residents", "Residents"), ("visitors", "Visitors"), ("approvals", "Approvals"),
                    ("billing", "Billing"), ("security_alerts", "Security Alerts"), ("audit_logs", "Audit Logs"),
                    ("reports", "Reports"), ("settings", "Settings"), ("complaints", "Complaints"),
                    ("notices", "Notices"), ("payments", "Payments"), ("staff", "Staff"),
                    ("vendors", "Vendors"), ("analytics", "Analytics"), ("gate_entry", "Gate Entry"),
                    ("vehicles", "Vehicles"), ("deliveries", "Deliveries"),
                ], max_length=50)),
                ("can_view",   models.BooleanField(default=False)),
                ("can_create", models.BooleanField(default=False)),
                ("can_edit",   models.BooleanField(default=False)),
                ("can_delete", models.BooleanField(default=False)),
            ],
            options={"verbose_name": "Module Permission", "verbose_name_plural": "Module Permissions", "app_label": "roles_permissions"},
        ),
        migrations.AlterUniqueTogether(
            name="modulepermission",
            unique_together={("role", "module")},
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id",           models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user",         models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
                ("role",         models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users", to="roles_permissions.role")),
                ("society",      models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="user_profiles", to="platform_admin_create_society.society")),
                ("full_name",    models.CharField(max_length=200)),
                ("mobile",       models.CharField(max_length=20, unique=True)),
                ("status",       models.CharField(choices=[("active", "Active"), ("inactive", "Inactive")], default="active", max_length=20)),
                ("flat_number",  models.CharField(blank=True, default="", max_length=20)),
                ("description",  models.TextField(blank=True, default="")),
                ("raw_password", models.CharField(blank=True, default="", help_text="Cleared after welcome email is dispatched.", max_length=64)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "User Profile", "verbose_name_plural": "User Profiles", "ordering": ["-created_at"], "app_label": "roles_permissions"},
        ),
    ]
