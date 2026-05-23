from django.apps import AppConfig


class GenerateReceiptsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "apps.accountant.generate_receipts"
    label              = "accountant_generate_receipts"
