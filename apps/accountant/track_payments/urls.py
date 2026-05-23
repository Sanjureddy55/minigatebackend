"""
Track Payments URL Configuration
==================================
Base prefix in root urls.py: /api/accountant/track-payments/

  GET    /              Paginated list    (?search, ?month, ?status, ?payment_method,
                                           ?payment_type, ?building, ?flat, ?ordering)
  GET    /{id}/         Single payment detail
  GET    /summary/      KPI aggregate cards (same filters as list)
  GET    /export/       CSV download       (same filters as list)
"""

from django.urls import path

from .views import TrackPaymentsViewSet

track_list    = TrackPaymentsViewSet.as_view({"get": "list"})
track_detail  = TrackPaymentsViewSet.as_view({"get": "retrieve"})
track_summary = TrackPaymentsViewSet.as_view({"get": "summary"})
track_export  = TrackPaymentsViewSet.as_view({"get": "export"})

urlpatterns = [
    path("",          track_list,    name="accountant-track-payments-list"),
    path("summary/",  track_summary, name="accountant-track-payments-summary"),
    path("export/",   track_export,  name="accountant-track-payments-export"),
    path("<int:pk>/", track_detail,  name="accountant-track-payments-detail"),
]
