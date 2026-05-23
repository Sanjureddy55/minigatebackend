from django.apps import AppConfig


class PaymentReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "apps.accountant.payment_reports"
    label              = "accountant_payment_reports"
