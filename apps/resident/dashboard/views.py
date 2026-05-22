import logging

from django.db.models import Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from apps.society_admin.notice_board.models import Notice
from apps.society_admin.visitors.models import Visitor

from apps.common.utils import get_flat_id, get_society_id
from apps.resident.complaints.models import Complaint
from apps.resident.payments.models import MaintenanceDue, ResidentPayment
from apps.resident.visitors.models import GuestPass

from .serializers import ResidentDashboardSerializer

logger = logging.getLogger(__name__)


class ResidentDashboardView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/dashboard/?flat=<uuid>&society=<id>

    Returns KPI cards for the resident:
    - Pending bills (unpaid maintenance dues total)
    - Maintenance paid (this month)
    - Society fund used (total fundraiser raised in society)
    - Society balance (platform-level — placeholder)
    - Open complaints count
    - Active guest passes
    - Pending visitor approvals
    - Recent 5 notices
    """

    def get(self, request):
        flat_id    = get_flat_id(request)
        society_id = get_society_id(request)

        if not flat_id:
            return Response({"success": False, "message": "flat query param required (or ensure your profile has a flat_number)."}, status=400)

        today = timezone.localdate()

        # ── Financial KPIs ─────────────────────────────────────────────────────
        pending_bills = MaintenanceDue.objects.filter(
            flat_id=flat_id,
            status__in=[MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE],
        ).aggregate(total=Sum("amount"))["total"] or 0

        maintenance_paid = ResidentPayment.objects.filter(
            flat_id=flat_id,
            payment_type=ResidentPayment.PaymentType.MAINTENANCE,
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Society-level fundraiser contributions (raised_amount across active fundraisers)
        society_fund_used = 0
        society_balance   = 0
        if society_id:
            society_fund_used = float(
                Notice.objects.filter(
                    society_id=society_id,
                    category=Notice.Category.FUNDRAISER,
                ).aggregate(total=Sum("raised_amount"))["total"] or 0
            )

        # ── Operational KPIs ──────────────────────────────────────────────────
        open_complaints = Complaint.objects.filter(
            flat_id=flat_id,
            status__in=[Complaint.Status.OPEN, Complaint.Status.IN_PROGRESS],
        ).count()

        active_guest_passes = GuestPass.objects.filter(
            flat_id=flat_id,
            status=GuestPass.Status.ACTIVE,
        ).count()

        pending_visitor_approvals = Visitor.objects.filter(
            flat_id=flat_id,
            status=Visitor.Status.PENDING,
        ).count()

        # ── Recent notices ────────────────────────────────────────────────────
        notice_qs = Notice.objects.filter(status=Notice.Status.ACTIVE)
        if society_id:
            notice_qs = notice_qs.filter(society_id=society_id)
        recent_notices = list(
            notice_qs.order_by("-created_at")[:5].values(
                "id", "title", "category", "event_date", "raised_amount", "target_amount", "created_at"
            )
        )

        data = {
            "pending_bills":              float(pending_bills),
            "maintenance_paid":           float(maintenance_paid),
            "society_fund_used":          society_fund_used,
            "society_balance":            society_balance,
            "open_complaints":            open_complaints,
            "active_guest_passes":        active_guest_passes,
            "pending_visitor_approvals":  pending_visitor_approvals,
            "recent_notices":             recent_notices,
        }
        return Response({"success": True, "data": ResidentDashboardSerializer(data).data})