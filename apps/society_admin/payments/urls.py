from django.urls import path

from .views import DueDetailView, GenerateDuesView, PaymentsOverviewView

urlpatterns = [
    path("overview/",      PaymentsOverviewView.as_view(), name="society-payments-overview"),
    path("generate/",      GenerateDuesView.as_view(),     name="society-payments-generate"),
    path("dues/<int:pk>/", DueDetailView.as_view(),        name="society-due-detail"),
]
