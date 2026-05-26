import logging

from django.db.models import Avg, Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSupportStaff
from apps.support_staff.assigned_tickets.models import SupportTicket

from .serializers import ServiceHistorySerializer

logger = logging.getLogger(__name__)


class ServiceHistoryView(APIView):
    """
    GET /api/support-staff/service-history/

    Returns KPI stats + resolved/closed tickets for the logged-in support staff member.
    """
    permission_classes = [IsSupportStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        profile   = request.user.profile
        role_slug = getattr(getattr(profile, "role", None), "slug", "")

        base_qs = SupportTicket.objects.filter(
            society_id=society_id,
            status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED],
        )
        if role_slug == "support-staff":
            qs = base_qs.filter(assigned_to=profile)
        else:
            qs = base_qs

        tickets_resolved = qs.count()

        agg = qs.filter(rating__isnull=False).aggregate(avg_rating=Avg("rating"))
        avg_rating = round(agg["avg_rating"] or 0, 1) if agg["avg_rating"] else None

        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(resolved_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(resolved_at__date__lte=date_to)

        results = qs.select_related("assigned_to").order_by("-resolved_at")

        logger.info("SERVICE_HIST | society=%s by=%s", society_id, request.user.pk)
        return Response({
            "success": True,
            "stats": {
                "tickets_resolved": tickets_resolved,
                "avg_rating":       avg_rating,
            },
            "results": ServiceHistorySerializer(results, many=True).data,
        })
