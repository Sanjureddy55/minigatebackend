from django.apps import AppConfig


class ResidentPaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.resident.payments'
    label = 'resident_payments'