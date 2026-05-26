import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSupportStaff
from apps.support_staff.assigned_tickets.models import SupportTicket

from .models import Escalation
from .serializers import EscalationSerializer

logger = logging.getLogger(__name__)


class EscalationListCreateView(APIView):
    """
    GET  /api/support-staff/escalations/  — list escalations for the society
    POST /api/support-staff/escalations/  — raise a new escalation
    """
    permission_classes = [IsSupportStaff]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            Escalation.objects
            .filter(society_id=society_id)
            .select_related("ticket", "escalated_by", "reviewed_by")
            .order_by("-created_at")
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response({"success": True, "count": qs.count(), "results": EscalationSerializer(qs, many=True).data})

    def post(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ticket_id = request.data.get("ticket")
        if not ticket_id:
            return Response({"success": False, "message": "ticket is required."}, status=400)
        try:
            SupportTicket.objects.get(pk=ticket_id, society_id=society_id)
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)

        ser = EscalationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        escalation = ser.save(society_id=society_id, escalated_by=request.user.profile)
        logger.info("ESCALATION_RAISE | ticket=%s by=%s", ticket_id, request.user.pk)
        return Response({"success": True, "data": EscalationSerializer(escalation).data}, status=201)
