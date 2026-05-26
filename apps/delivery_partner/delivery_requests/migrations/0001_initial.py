import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('roles_permissions', '0004_merge_20260523_0258'),
        ('platform_admin_create_society', '0007_remove_society_platform_ad_city_id_8aaead_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Delivery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('delivery_id', models.CharField(db_index=True, max_length=20, unique=True)),
                ('item_name', models.CharField(max_length=300)),
                ('vendor_name', models.CharField(blank=True, default='', max_length=200)),
                ('tracking_number', models.CharField(blank=True, default='', max_length=100)),
                ('resident_name', models.CharField(max_length=200)),
                ('resident_phone', models.CharField(blank=True, default='', max_length=20)),
                ('flat_number', models.CharField(max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('out_for_delivery', 'Out for Delivery'), ('delivered', 'Delivered'), ('failed', 'Failed'), ('returned', 'Returned')], default='pending', max_length=20)),
                ('delivery_note', models.CharField(blank=True, default='', max_length=500)),
                ('failure_reason', models.CharField(blank=True, default='', max_length=500)),
                ('time_slot_start', models.TimeField(blank=True, null=True)),
                ('time_slot_end', models.TimeField(blank=True, null=True)),
                ('picked_up_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('failed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_deliveries', to='roles_permissions.userprofile')),
                ('society', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='deliveries', to='platform_admin_create_society.society')),
            ],
            options={
                'ordering': ['-created_at'],
                'app_label': 'delivery_partner_delivery_requests',
            },
        ),
    ]
