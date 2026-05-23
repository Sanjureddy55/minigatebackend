from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("society_admin_maintenance_expenses", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="maintenanceexpense",
            name="payment_mode",
            field=models.CharField(
                blank=True,
                choices=[
                    ("upi",           "UPI"),
                    ("cash",          "Cash"),
                    ("cheque",        "Cheque"),
                    ("bank_transfer", "Bank Transfer"),
                    ("online",        "Online"),
                ],
                default="upi",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="maintenanceexpense",
            name="invoice_number",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Invoice / bill reference number.",
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name="maintenanceexpense",
            name="building_area",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Building or common area (e.g. Tower A, Common Area).",
                max_length=200,
            ),
        ),
    ]
