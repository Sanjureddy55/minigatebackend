from django.urls import path
from apps.delivery_partner.delivery_requests.access_pass_views import (
    DeliveryAccessPassView,
    DeliveryQRCodeView,
    DeliveryEntryStatusView,
)

urlpatterns = [
    path("",              DeliveryAccessPassView.as_view()),
    path("qr/",           DeliveryQRCodeView.as_view()),
    path("entry-status/", DeliveryEntryStatusView.as_view()),
]
