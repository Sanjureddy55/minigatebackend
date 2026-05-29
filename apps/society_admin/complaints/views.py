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

from .serializers import (
    ComplaintAssignSerializer,
    ComplaintResolveSerializer,
    ComplaintStatsSerializer,
    LogComplaintSerializer,
    SocietyComplaintSerializer,
)

logger = logging.getLogger(__name__)


def _admin_society(request):
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


class SocietyComplaintViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Complaints — society-scoped.

    GET    /api/society-admin/complaints/              List all complaints
    GET    /api/society-admin/complaints/stats/        KPI cards (Open / In Progress / Resolved)
    POST   /api/society-admin/complaints/log/          Log complaint for a resident
    GET    /api/society-admin/complaints/{id}/         Detail
    PATCH  /api/society-admin/complaints/{id}/         Update priority / notes
    POST   /api/society-admin/complaints/{id}/assign/       Assign to staff → In Review
    POST   /api/society-admin/complaints/{id}/in-progress/  Open → In Review
    POST   /api/society-admin/complaints/{id}/resolve/      Resolve → Approved
    POST   /api/society-admin/complaints/{id}/close/        Close complaint
    """

    serializer_class = SocietyComplaintSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "category", "priority", "flat"]   # 'society' removed
    search_fields    = ["title", "flat__flat_number", "resident__full_name"]
    ordering_fields  = ["created_at", "priority", "status", "updated_at"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            Complaint.objects
            .filter(society=society)
            .select_related(
                "resident", "resident__user",
                "flat", "flat__building",
                "society",
                "assigned_to", "assigned_to__user",
            )
            .order_by("-created_at")
        )

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

    # ── KPI Stats (3 cards in UI) ────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        GET /api/society-admin/complaints/stats/
        No params needed — auto-scoped to admin's society.
        Maps to: Open (14), In Progress (9), Resolved (30d) (122).
        """
        society  = _admin_society(request)
        qs       = Complaint.objects.filter(society=society)
        cutoff   = timezone.now() - timezone.timedelta(days=30)

        agg = qs.aggregate(
            total         = Count("id"),
            open_count    = Count("id", filter=Q(status=Complaint.Status.OPEN)),
            in_progress   = Count("id", filter=Q(status=Complaint.Status.IN_PROGRESS)),
            resolved_30d  = Count("id", filter=Q(status=Complaint.Status.RESOLVED, resolved_at__gte=cutoff)),
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

    # ── Log Complaint (+ Log Complaint button in UI) ─────────────────────────

    @action(detail=False, methods=["post"], url_path="log")
    def log_complaint(self, request):
        """
        POST /api/society-admin/complaints/log/

        Log a complaint on behalf of a resident.
        Society auto-injected. Flat by flat_number. Resident by mobile or ID.

        Body:
          {
            "flat_number":      "A-402",
            "resident_mobile":  "9100000001",   ← preferred
            "title":            "Water leakage in bathroom",
            "description":      "Bathroom pipe leaking since 2 days.",
            "category":         "maintenance",
            "priority":         "high"
          }
        """
        society = _admin_society(request)

        ser = LogComplaintSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Resolve flat — "common" means no specific flat
        flat_number = d["flat_number"].strip()
        flat = None
        if flat_number.lower() != "common":
            flat = (
                Flat.objects
                .filter(building__society=society, flat_number__iexact=flat_number)
                .first()
            )
            if not flat:
                return Response(
                    {"detail": f"Flat '{flat_number}' not found in this society."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Resolve resident — by mobile preferred, fallback to ID
        resident = None
        if d.get("resident_mobile"):
            resident = UserProfile.objects.filter(
                mobile=d["resident_mobile"].strip(), society=society
            ).first()
            if not resident:
                return Response(
                    {"detail": f"No resident found with mobile {d['resident_mobile']} in this society."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif d.get("resident_id"):
            try:
                resident = UserProfile.objects.get(pk=d["resident_id"], society=society)
            except UserProfile.DoesNotExist:
                return Response(
                    {"detail": "Resident profile not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Flat is required unless "common"
        if flat is None and flat_number.lower() != "common":
            return Response(
                {"detail": "Flat not found. Use 'common' for common-area complaints."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # For common-area complaints, use any flat if required by model constraint
        # (Flat FK is NOT NULL on Complaint) — use first flat in society
        if flat is None:
            flat = Flat.objects.filter(building__society=society).first()
            if not flat:
                return Response(
                    {"detail": "No flats exist in this society yet."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        complaint = Complaint.objects.create(
            society     = society,
            flat        = flat,
            resident    = resident,
            title       = d["title"],
            description = d["description"],
            category    = d["category"],
            priority    = d.get("priority", Complaint.Priority.MEDIUM),
            photo_url   = d.get("photo_url", ""),
            status      = Complaint.Status.OPEN,
        )

        logger.info(
            "COMPLAINT_LOG | id=%s cmp=%s society=%s flat=%s by=%s",
            complaint.pk, complaint.complaint_number, society.pk, flat.pk, request.user,
        )
        log_society_action(
            request=request, society_id=society.pk,
            action="logged complaint", action_type="complaint",
            target=complaint.title, target_type="complaint", target_id=str(complaint.pk),
        )
        return Response(
            {"success": True, "data": SocietyComplaintSerializer(complaint).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Status transitions ────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        """Assign to staff — auto-moves Open → In Review."""
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

        logger.info("COMPLAINT_ASSIGN | id=%s to=%s by=%s", complaint.pk, staff.pk, request.user)
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})

    @action(detail=True, methods=["post"], url_path="in-progress")
    def in_progress(self, request, pk=None):
        """Move Open (Pending) → In Review."""
        complaint = self.get_object()
        if complaint.status != Complaint.Status.OPEN:
            return Response(
                {"detail": f"Complaint is '{complaint.status}', not open."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        complaint.status = Complaint.Status.IN_PROGRESS
        complaint.save(update_fields=["status", "updated_at"])
        logger.info("COMPLAINT_INPROGRESS | id=%s by=%s", complaint.pk, request.user)
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """Resolve complaint — shows as Approved in UI."""
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
        """Close complaint — final state."""
        complaint = self.get_object()
        if complaint.status == Complaint.Status.CLOSED:
            return Response({"detail": "Complaint is already closed."}, status=status.HTTP_400_BAD_REQUEST)
        complaint.status = Complaint.Status.CLOSED
        complaint.save(update_fields=["status", "updated_at"])
        logger.info("COMPLAINT_CLOSE | id=%s by=%s", complaint.pk, request.user)
        return Response({"success": True, "data": SocietyComplaintSerializer(complaint).data})
