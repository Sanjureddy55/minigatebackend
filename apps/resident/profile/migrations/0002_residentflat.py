import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resident_profile', '0001_initial'),
        ('platform_admin_create_society', '0001_initial'),
        ('roles_permissions', '0002_alter_role_role_type'),
        ('society_admin_flats', '0003_remove_flat_flat_building_number_uniq_alter_flat_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResidentFlat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_primary', models.BooleanField(default=False)),
                ('status', models.CharField(
                    choices=[('pending', 'Pending Approval'), ('active', 'Active'), ('inactive', 'Inactive / Rejected')],
                    default='pending',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('flat', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resident_occupants',
                    to='society_admin_flats.flat',
                )),
                ('profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resident_flats',
                    to='roles_permissions.userprofile',
                )),
                ('society', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resident_flat_links',
                    to='platform_admin_create_society.society',
                )),
            ],
            options={
                'verbose_name': 'Resident Flat',
                'verbose_name_plural': 'Resident Flats',
                'ordering': ['-is_primary', '-created_at'],
                'unique_together': {('profile', 'flat')},
            },
        ),
    ]
