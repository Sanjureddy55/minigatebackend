from django.apps import AppConfig


class GuestUserDashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.guest_user.dashboard'
    label = 'guest_user_dashboard'