from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("society_admin_notice_board", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="notice",
            name="image",
            field=models.ImageField(
                blank=True, null=True,
                upload_to="notice_images/%Y/%m/",
                help_text="Banner image for the notice/event.",
            ),
        ),
        migrations.AddField(
            model_name="notice",
            name="min_contribution",
            field=models.DecimalField(
                blank=True, null=True,
                max_digits=10, decimal_places=2,
                help_text="Minimum contribution per resident.",
            ),
        ),
        migrations.AddField(
            model_name="notice",
            name="max_contribution",
            field=models.DecimalField(
                blank=True, null=True,
                max_digits=10, decimal_places=2,
                help_text="Maximum contribution per resident.",
            ),
        ),
    ]
