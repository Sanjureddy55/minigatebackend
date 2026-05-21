from django.apps import AppConfig


class GuestUserAccessPassConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.guest_user.access_pass'
    label = 'guest_user_access_pass'