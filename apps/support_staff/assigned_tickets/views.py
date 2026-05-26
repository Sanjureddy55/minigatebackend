import logging

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.common.permissions import IsSupportStaff

from .models import SupportTicket
from .serializers import SupportTicketSerializer, SupportTicketCreateSerializer

logger = logging.getLogger(__name__)


class TicketPagination(PageNumberPagination):
    page_size             = 25
    page_size_query_param = "page_size"
    max_page_size         = 100


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _role_slug(request):
    try:
        return request.user.profile.role.slug or ""
    except Exception:
        return ""


class SupportTicketViewSet(viewsets.ViewSet):
    """
    GET    /api/support-staff/assigned-tickets/              — list tickets
    POST   /api/support-staff/assigned-tickets/              — create ticket
    GET    /api/support-staff/assigned-tickets/<id>/         — retrieve
    PATCH  /api/support-staff/assigned-tickets/<id>/pickup/  — assign to self, mark in_progress
    PATCH  /api/support-staff/assigned-tickets/<id>/resolve/ — mark resolved
    """
    permission_classes = [IsSupportStaff]

    def list(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            SupportTicket.objects
            .filter(society_id=society_id)
            .select_related("assigned_to", "created_by", "resident")
            .order_by("-created_at")
        )

        if _role_slug(request) == "support-staff":
            qs = qs.filter(assigned_to=request.user.profile)

        status_filter   = request.query_params.get("status")
        priority_filter = request.query_params.get("priority")
        search          = request.query_params.get("search", "").strip()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if search:
            qs = qs.filter(subject__icontains=search)

        paginator = TicketPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(SupportTicketSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": SupportTicketSerializer(qs, many=True).data})

    def create(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)
        ser = SupportTicketCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ticket = ser.save(
            society_id=society_id,
            created_by=request.user.profile,
            assigned_to=request.user.profile,
        )
        return Response(
            {"success": True, "message": "Ticket created.", "data": SupportTicketSerializer(ticket).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        society_id = _sid(request)
        try:
            ticket = SupportTicket.objects.select_related("assigned_to", "created_by", "resident").get(
                pk=pk, society_id=society_id
            )
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)
        return Response({"success": True, "data": SupportTicketSerializer(ticket).data})

    @action(detail=True, methods=["patch"], url_path="pickup")
    def pickup(self, request, pk=None):
        society_id = _sid(request)
        try:
            ticket = SupportTicket.objects.get(pk=pk, society_id=society_id)
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)
        if ticket.status != SupportTicket.Status.OPEN:
            return Response({"success": False, "message": "Only OPEN tickets can be picked up."}, status=400)
        ticket.status      = SupportTicket.Status.IN_PROGRESS
        ticket.assigned_to = request.user.profile
        ticket.save(update_fields=["status", "assigned_to", "updated_at"])
        logger.info("TICKET_PICKUP | ticket=%s by=%s", ticket.pk, request.user.pk)
        return Response({"success": True, "data": SupportTicketSerializer(ticket).data})

    @action(detail=True, methods=["patch"], url_path="resolve")
    def resolve(self, request, pk=None):
        society_id = _sid(request)
        try:
            ticket = SupportTicket.objects.get(pk=pk, society_id=society_id)
        except SupportTicket.DoesNotExist:
            return Response({"success": False, "message": "Ticket not found."}, status=404)
        if ticket.status not in (SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS):
            return Response({"success": False, "message": "Ticket is already resolved or closed."}, status=400)
        notes      = request.data.get("resolution_notes", "")
        time_taken = request.data.get("time_taken", "")
        ticket.status           = SupportTicket.Status.RESOLVED
        ticket.resolved_at      = timezone.now()
        ticket.resolution_notes = notes
        ticket.time_taken       = time_taken
        ticket.save(update_fields=["status", "resolved_at", "resolution_notes", "time_taken", "updated_at"])
        logger.info("TICKET_RESOLVE | ticket=%s by=%s", ticket.pk, request.user.pk)
        return Response({"success": True, "data": SupportTicketSerializer(ticket).data})
