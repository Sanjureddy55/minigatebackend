from django.urls import path

from .views import PaymentsOverviewView

urlpatterns = [
    path("overview/", PaymentsOverviewView.as_view(), name="society-payments-overview"),
]
