from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSuperAdmin


# In-memory defaults (would be a DB model in production)
_SETTINGS = {
    "platform_name":       "MiniGate",
    "support_email":       "support@minigate.dev",
    "otp_expiry_minutes":  10,
    "hardcoded_otp":       True,
    "maintenance_mode":    False,
    "max_login_attempts":  5,
    "default_plan":        "free",
}


class SystemSettingsView(APIView):
    """
    GET   /api/platform-admin/system-settings/  — retrieve platform settings
    PATCH /api/platform-admin/system-settings/  — update settings
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return Response({"success": True, "data": dict(_SETTINGS)})

    def patch(self, request):
        allowed = {"support_email", "maintenance_mode", "max_login_attempts", "default_plan"}
        for key in allowed:
            if key in request.data:
                _SETTINGS[key] = request.data[key]
        return Response({"success": True, "message": "Settings updated.", "data": dict(_SETTINGS)})
