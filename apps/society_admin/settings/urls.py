from django.urls import path

from .views import SocietySettingsView

urlpatterns = [
    path("", SocietySettingsView.as_view(), name="society-settings"),
]
