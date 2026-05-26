from django.urls import path

from .views import QRCheckInView, QRRecentVerificationsView, QRSampleCodesView, QRVerifyView

urlpatterns = [
    path("verify/",        QRVerifyView.as_view()),
    path("checkin/",       QRCheckInView.as_view()),
    path("recent/",        QRRecentVerificationsView.as_view()),
    path("sample-codes/",  QRSampleCodesView.as_view()),
]
