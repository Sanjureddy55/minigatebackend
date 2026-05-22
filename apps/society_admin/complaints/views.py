import logging

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsSocietyAdmin

from apps.platform_admin.create_society.models import Society
from apps.resident.complaints.models import Complaint
from apps.roles_permissions.models import UserProfile
from apps.society_admin.audit_logs.utils import log_society_action
from apps.society_admin.flats.models import Flat
from apps.common.utils import get_society_id

from .serializers import (
    ComplaintAssignSerializer,
    ComplaintResolveSerializer,
    ComplaintStatsSerializer,
    LogComplaintSerializer,
    SocietyComplaintSerializer,
)

logger = logging.getLogger(__name__)


class SocietyComplaintViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Society Admin view of resident-raised complaints.

    ┌──────────────────────────────────────────────────────────────────────────┐
    │ GET    /                       Paginated list — CMP-xxxx / flat / status │
    │ GET    /stats/?society=<id>    KPIs: Open | In Progress | Resolved (30d) │
    │ POST   /log/                   Log a complaint on behalf of a resident   │
    │ GET    /<id>/                  Detail                                     │
    │ PATCH  /<id>/                  Update priority / notes                    │
    │ POST   /<id>/assign/           Assign to staff → auto In Review           │
    │ POST   /<id>/in-progress/      Move Pending → In Review                  │
    │ POST   /<id>/resolve/          Resolve with resolution_notes → Approved  │
    │ POST   /<id>/close/            Close complaint                            │
    └──────────────────────────────────────────────────────────────────────────┘

    Filters:  ?society= ?status= ?category= ?priority= ?flat=
    Search:   ?search=  (title, flat_number, resident full_name)
    Ordering: ?ordering=created_at | priority | status | updated_at
    """

    serializer_class = SocietyComplaintSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "status", "category", "priority", "flat"]
    search_fields    = ["title", "flat__flat_number", "resident__full_name"]
    ordering_fields  = ["created_at", "priority", "status", "updated_at"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return (
            Complaint.objects
            .select_related(
                "resident", "resident__user",
                "flat", "flat__building",
                "society",
                "assigned_to", "assigned_to__user",
            )
            .order_by("-created_at")
        )

    # ── Disable raw create / delete ───────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Use POST /log/ to log a complaint on behalf of a resident."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Complaints cannot be deleted — use /close/ instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    # ── KPI stats — matches the 3 card UI exactly ────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        GET /stats/?society=<id>

        Returns the three KPI cards shown in the UI:
          open         → "Open" card         (Pending in table)
          in_progress  → "In Progress" card  (In Review in table)
          resolved_30d → "Resolved (30d)" card (Approved in table, last 30 days)
        """
        society_id = get_society_id(request)
        qs = Complaint.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        cutoff_30d = timezone.now() - timezone.timedelta(days=30)

        agg = qs.aggregate(
            total         = Count("id"),
            open_count    = Count("id", filter=Q(status=Complaint.Status.OPEN)),
            in_progress   = Count("id", filter=Q(status=Complaint.Status.IN_PROGRESS)),
            resolved_30d  = Count("id", filter=Q(
                status=Complaint.Status.RESOLVED,
                resolved_at__gte=cutoff_30d,
            )),
            closed        = Count("id", filter=Q(status=Complaint.Status.CLOSED)),
            high_priority = Count("id", filter=Q(
                priority__in=[Complaint.Priority.HIGH, Complaint.Priority.URGENT],
                status__in=[Complaint.Status.OPEN, Complaint.Status.IN_PROGRESS],
            )),
        )

        data = {
            "total":         agg["total"],
            "open":          agg["open_count"],
            "in_progress":   agg["in_progress"],
            "resolved_30d":  agg["resolved_30d"],
            "closed":        agg["closed"],
            "high_priority": agg["high_priority"],
        }
        return Response({"success": True, "data": ComplaintStatsSerializer(data).data})

    # ── Log Complaint — "+ Log Complaint" button in UI ───────────────────────

    @action(detail=False, methods=["post"], url_path="log")
    def log_complaint(self, request):
        """
        POST /log/

        Society admin raises a complaint on behalf of a resident.
        Body: { society, flat (UUID), resident (profile pk), title,
                description, category, priority, photo_url? }
        """
        ser = LogComplaintSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            society = Society.objects.get(pk=d["society"])
        except Society.DoesNotExist:
            return Response({"detail": "Society not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            flat = Flat.objects.get(pk=d["flat"])
        except Flat.DoesNotExist:
            return Response({"detail": "Flat not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            resident = UserProfile.objects.get(pk=d["resident"])
        except UserProfile.DoesNotExist:
            return Response({"detail": "Resident profile not found."}, status=status.HTTP_404_NOT_FOUND)

        complaint = Complaint.objects.create(
            society=society,
            flat=flat,
            resident=resident,
            title=d["title"],
            description=d["description"],
            category=d["category"],
            priority=d.get("priority", Complaint.Priority.MEDIUM),
            photo_url=d.get("photo_url", ""),
            status=Complaint.Status.OPEN,
        )

        logger.info(
            "COMPLAINT_LOG | id=%s cmp=%s society=%s flat=%s by=%s",
            complaint.pk, complaint.complaint_number, society.pk, flat.pk, request.user,
        )
        log_society_action(
            request=request, society_id=society.pk,
            action="raised complaint", action_type="complaint",
            target=complaint.title, target_type="complaint", target_id=str(complaint.pk),
        )
        return Response(
            {"success": True, "data": SocietyComplaintSerializer(complaint).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Status transition actions ─────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        """Assign complaint to staff — auto-moves Open (Pending) → In Review."""
        complaint = self.get_object()
        ser = ComplaintAssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            staff = UserProfile.objects.get(pk=ser.validated_data["assigned_to"])
        except UserProfile.DoesNotExist:
            return Response({"detail": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

        complaint.assigned_to = staff
        if complaint.status == Complaint.Status.OPEN:
            complaint.status = Complaint.Status.IN_PROGRESS
        update_fields = ["assigned_to", "status", "updated_at"]
        if notes := ser.validated_data.get("notes"):
            complaint.resolution_notes = notes
            update_fields.append("resolution_notes")
        complaint.save(update_fields=update_fields)

        logger.info("COMPLAINT_ASSIGN | id=%s assigned_to=%s by=%s", complaint.pk, staff.pk, request.user)
        log_society_action(
            request=request, society_id=complaint.society_id,
            action="assigned complaint", action_type="assign",
            target=complaint.title, target_type="complaint", target_id=str(complaint.pk),
        )
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})

    @action(detail=True, methods=["post"], url_path="in-progress")
    def in_progress(self, request, pk=None):
        """Move Pending (open) → In Review (in_progress)."""
        complaint = self.get_object()
        if complaint.status != Complaint.Status.OPEN:
            return Response(
                {"detail": f"Complaint is '{complaint.status}', not open — cannot move to In Review."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        complaint.status = Complaint.Status.IN_PROGRESS
        complaint.save(update_fields=["status", "updated_at"])
        logger.info("COMPLAINT_INPROGRESS | id=%s by=%s", complaint.pk, request.user)
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """Resolve complaint (Approved in table). Requires resolution_notes."""
        complaint = self.get_object()
        if complaint.status == Complaint.Status.RESOLVED:
            return Response({"detail": "Complaint is already resolved."}, status=status.HTTP_400_BAD_REQUEST)

        ser = ComplaintResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        complaint.status           = Complaint.Status.RESOLVED
        complaint.resolution_notes = ser.validated_data["resolution_notes"]
        complaint.resolved_at      = timezone.now()
        complaint.save(update_fields=["status", "resolution_notes", "resolved_at", "updated_at"])

        logger.info("COMPLAINT_RESOLVE | id=%s by=%s", complaint.pk, request.user)
        log_society_action(
            request=request, society_id=complaint.society_id,
            action="resolved complaint", action_type="resolve",
            target=complaint.title, target_type="complaint", target_id=str(complaint.pk),
        )
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        """Close complaint — final state, no further transitions."""
        complaint = self.get_object()
        if complaint.status == Complaint.Status.CLOSED:
            return Response({"detail": "Complaint is already closed."}, status=status.HTTP_400_BAD_REQUEST)

        complaint.status = Complaint.Status.CLOSED
        complaint.save(update_fields=["status", "updated_at"])
        logger.info("COMPLAINT_CLOSE | id=%s by=%s", complaint.pk, request.user)
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})