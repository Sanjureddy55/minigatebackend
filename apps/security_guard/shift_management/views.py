import logging

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard, _get_role_slug

from .models import GuardShift
from .serializers import GuardShiftSerializer

logger = logging.getLogger(__name__)


class ShiftListView(APIView):
    """
    GET /api/security-guard/shift-management/

    Guards see only their own shifts.
    Society Admins / Super Admins can pass ?guard=<profile_id> to filter by guard.
    Optional filters: ?date=YYYY-MM-DD  ?status=scheduled|active|completed|absent
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
            profile    = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            GuardShift.objects
            .filter(society_id=society_id)
            .select_related("guard")
        )

        role = _get_role_slug(request)
        if role in ("society-admin", "super-admin"):
            guard_id = request.query_params.get("guard")
            if guard_id:
                qs = qs.filter(guard_id=guard_id)
        else:
            qs = qs.filter(guard=profile)

        date_str     = request.query_params.get("date")
        shift_status = request.query_params.get("status")
        if date_str:
            qs = qs.filter(shift_date=date_str)
        if shift_status:
            qs = qs.filter(status=shift_status)

        qs = qs.order_by("-shift_date", "start_time")
        return Response({"success": True, "count": qs.count(), "results": GuardShiftSerializer(qs, many=True).data})


class TodayShiftView(APIView):
    """
    GET /api/security-guard/shift-management/today/

    Returns the logged-in guard's shift(s) for today.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            profile    = request.user.profile
            society_id = profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today  = timezone.localdate()
        shifts = (
            GuardShift.objects
            .filter(guard=profile, society_id=society_id, shift_date=today)
            .select_related("guard")
            .order_by("start_time")
        )
        return Response({
            "success": True,
            "date":    str(today),
            "shifts":  GuardShiftSerializer(shifts, many=True).data,
        })
