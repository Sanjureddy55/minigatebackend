from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('platform_admin_create_society', '0002_rename_platform_ad_status_idx_platform_ad_status_18d3bc_idx_and_more'),
        ('society_admin_buildings', '0001_initial'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='building',
            unique_together={('society', 'name')},
        ),
    ]
