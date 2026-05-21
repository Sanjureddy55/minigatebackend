from django.apps import AppConfig


class GuestUserProfileConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.guest_user.profile'
    label = 'guest_user_profile'