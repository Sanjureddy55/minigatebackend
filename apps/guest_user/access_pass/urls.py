from django.urls import path
from .views import GuestAccessPassView, GuestQRCodeView, GuestEntryStatusView

urlpatterns = [
    path("",              GuestAccessPassView.as_view()),
    path("qr/",           GuestQRCodeView.as_view()),
    path("entry-status/", GuestEntryStatusView.as_view()),
]
