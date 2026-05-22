from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('society_admin_buildings', '0001_initial'),
        ('society_admin_flats', '0001_initial'),
    ]

    operations = [
        # unique_together (building, flat_number) already exists in the DB from 0001_initial
    ]
