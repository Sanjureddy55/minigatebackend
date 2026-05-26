import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSupportStaff
from apps.support_staff.assigned_tickets.models import SupportTicket

from .models import TicketUpdate
from .serializers import TicketUpdateSerializer

logger = logging.getLogger(__name__)


class TicketUpdateListCreateView(APIView):
    """
    GET  /api/support-staff/ticket-updates/?ticket=<id>  — list updates for a ticket
    POST /api/support-staff/ticket-updates/              — add an update
    """
    permission_classes = [IsSupportStaff]

    def get(self, request):
        ticket_id = request.query_params.get("ticket")
        if not ticket_id:
            return Response({"success": False, "message": "?ticket=<id> required."}, status=400)
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)
        try:
            ticket = SupportTicket.objects.get(pk=ticket_id, society_id=society_id)
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)
        updates = TicketUpdate.objects.filter(ticket=ticket).select_related("updated_by")
        return Response({"success": True, "results": TicketUpdateSerializer(updates, many=True).data})

    def post(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)
        ticket_id = request.data.get("ticket")
        if not ticket_id:
            return Response({"success": False, "message": "ticket is required."}, status=400)
        try:
            ticket = SupportTicket.objects.get(pk=ticket_id, society_id=society_id)
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)
        ser = TicketUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        update = ser.save(updated_by=request.user.profile)
        logger.info("TICKET_UPDATE_ADD | ticket=%s by=%s", ticket.pk, request.user.pk)
        return Response({"success": True, "data": TicketUpdateSerializer(update).data}, status=201)
