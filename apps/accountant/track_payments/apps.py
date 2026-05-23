from django.apps import AppConfig


class TrackPaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "apps.accountant.track_payments"
    label              = "accountant_track_payments"
