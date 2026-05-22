from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.common.utils import get_society_id
from apps.platform_admin.create_society.models import Society


class SocietySettingsView(APIView):
    """
    GET  /api/society-admin/settings/   — retrieve society settings
    PATCH /api/society-admin/settings/  — update contact/admin email
    """
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)
        try:
            soc = Society.objects.select_related("city").get(pk=society_id)
        except Society.DoesNotExist:
            return Response({"success": False, "message": "Society not found."}, status=404)

        return Response({
            "success": True,
            "data": {
                "id":            soc.pk,
                "name":          soc.name,
                "plan":          soc.plan,
                "status":        soc.status,
                "total_flats":   soc.total_flats,
                "admin_email":   soc.admin_email,
                "city":          soc.city.name if soc.city else None,
                "created_at":    soc.created_at,
            }
        })

    def patch(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)
        try:
            soc = Society.objects.get(pk=society_id)
        except Society.DoesNotExist:
            return Response({"success": False, "message": "Society not found."}, status=404)

        allowed = {"admin_email", "name"}
        for field in allowed:
            if field in request.data:
                setattr(soc, field, request.data[field])
        soc.save()
        return Response({"success": True, "message": "Settings updated."})
