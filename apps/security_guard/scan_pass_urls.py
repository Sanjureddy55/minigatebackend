from django.urls import path
from apps.security_guard.qr_passcode.scan_views import ScanAccessPassView

urlpatterns = [
    path("", ScanAccessPassView.as_view(), name="scan-access-pass"),
]
