import logging

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSupportStaff
from apps.support_staff.assigned_tickets.models import SupportTicket
from apps.support_staff.assigned_tickets.serializers import SupportTicketSerializer

logger = logging.getLogger(__name__)


class SupportDashboardView(APIView):
    """
    GET /api/support-staff/dashboard/

    Returns stats + active ticket queue for the logged-in support staff member.
    """
    permission_classes = [IsSupportStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        profile   = request.user.profile
        role_slug = getattr(getattr(profile, "role", None), "slug", "")

        base_qs = SupportTicket.objects.filter(society_id=society_id)
        if role_slug == "support-staff":
            my_qs = base_qs.filter(assigned_to=profile)
        else:
            my_qs = base_qs

        today      = timezone.localdate()
        week_start = today - timezone.timedelta(days=today.weekday())

        open_count       = my_qs.filter(status=SupportTicket.Status.OPEN).count()
        in_progress_count= my_qs.filter(status=SupportTicket.Status.IN_PROGRESS).count()
        resolved_week    = my_qs.filter(
            status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED],
            resolved_at__date__gte=week_start,
        ).count()
        avg_rating = None
        rated = my_qs.filter(rating__isnull=False)
        if rated.exists():
            from django.db.models import Avg
            avg_rating = round(rated.aggregate(avg=Avg("rating"))["avg"] or 0, 1)

        active_tickets = (
            my_qs
            .filter(status__in=[SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS])
            .select_related("assigned_to", "created_by", "resident")
            .order_by("priority", "-created_at")[:10]
        )

        recently_resolved = (
            my_qs
            .filter(status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED])
            .select_related("assigned_to", "created_by", "resident")
            .order_by("-resolved_at")[:5]
        )

        logger.info("SUPPORT_DASH | society=%s by=%s", society_id, request.user.pk)
        return Response({
            "success": True,
            "data": {
                "stats": {
                    "open":             open_count,
                    "in_progress":      in_progress_count,
                    "resolved_this_week": resolved_week,
                    "avg_rating":       avg_rating,
                },
                "active_tickets":     SupportTicketSerializer(active_tickets, many=True).data,
                "recently_resolved":  SupportTicketSerializer(recently_resolved, many=True).data,
            },
        })
