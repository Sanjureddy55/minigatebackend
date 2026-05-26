import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('roles_permissions', '0004_merge_20260523_0258'),
        ('platform_admin_create_society', '0007_remove_society_platform_ad_city_id_8aaead_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccessPass',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_role', models.CharField(choices=[('delivery-partner', 'Delivery Partner'), ('guest-user', 'Guest User')], max_length=30)),
                ('visitor_name', models.CharField(blank=True, default='', max_length=200)),
                ('visitor_phone', models.CharField(blank=True, default='', max_length=20)),
                ('host_resident_name', models.CharField(blank=True, default='', max_length=200)),
                ('host_flat_number', models.CharField(blank=True, default='', max_length=20)),
                ('purpose', models.CharField(blank=True, default='', max_length=300)),
                ('passcode', models.CharField(db_index=True, max_length=30, unique=True)),
                ('qr_code_value', models.CharField(db_index=True, max_length=100, unique=True)),
                ('valid_from', models.DateTimeField(default=django.utils.timezone.now)),
                ('valid_until', models.DateTimeField()),
                ('status', models.CharField(choices=[('active', 'Active'), ('used', 'Used'), ('expired', 'Expired'), ('revoked', 'Revoked')], default='active', max_length=20)),
                ('gate', models.CharField(blank=True, default='', max_length=100)),
                ('entry_confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('exit_confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('scanned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='scanned_passes', to='roles_permissions.userprofile')),
                ('society', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='access_passes', to='platform_admin_create_society.society')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='access_passes', to='roles_permissions.userprofile')),
            ],
            options={
                'ordering': ['-created_at'],
                'app_label': 'common',
            },
        ),
        migrations.CreateModel(
            name='AccessScanLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gate', models.CharField(blank=True, default='', max_length=100)),
                ('scan_result', models.CharField(choices=[('success', 'Success'), ('failed', 'Failed')], max_length=10)),
                ('failure_reason', models.CharField(blank=True, default='', max_length=300)),
                ('raw_qr_value', models.CharField(blank=True, default='', max_length=200)),
                ('scanned_at', models.DateTimeField(auto_now_add=True)),
                ('access_pass', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='scan_logs', to='common.accesspass')),
                ('scanned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='scan_logs', to='roles_permissions.userprofile')),
            ],
            options={
                'ordering': ['-scanned_at'],
                'app_label': 'common',
            },
        ),
    ]
