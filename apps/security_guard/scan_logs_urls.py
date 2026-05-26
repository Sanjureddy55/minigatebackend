from django.urls import path
from apps.security_guard.qr_passcode.scan_views import ScanLogsView

urlpatterns = [
    path("", ScanLogsView.as_view(), name="access-scan-logs"),
]
