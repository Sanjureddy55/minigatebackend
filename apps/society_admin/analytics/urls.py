from django.urls import path

from .views import SocietyAnalyticsView

urlpatterns = [
    path("", SocietyAnalyticsView.as_view(), name="society-analytics"),
]
