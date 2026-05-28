import calendar
import logging
from datetime import date, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.common.utils import get_society_id
from apps.platform_admin.create_society.models import Society
from apps.resident.complaints.models import Complaint
from apps.resident.payments.models import MaintenanceDue
from apps.roles_permissions.models import UserProfile
from apps.society_admin.approvals.models import ApprovalRequest
from apps.society_admin.security.models import SecurityAlert
from apps.society_admin.staff_guards.models import StaffMember
from apps.society_admin.visitors.models import Visitor

from .serializers import SocietyDashboardSerializer

logger = logging.getLogger(__name__)

STAFF_ROLE_SLUGS = [
    "security-guard", "accountant",
    "maintenance-staff", "support-staff", "delivery-partner",
]


def _pct_change(current: int, previous: int) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


def _time_ago(dt, now) -> str:
    if dt is None:
        return ""
    delta = now - dt
    s = int(delta.total_seconds())
    if s < 60:
        return "just now"
    if s < 3600:
        m = s // 60
        return f"{m} min ago"
    if s < 86400:
        h = s // 3600
        return f"{h} hr ago"
    return f"{delta.days} days ago"


class SocietyDashboardView(APIView):
    """
    GET /api/society-admin/dashboard/?society=<id>&flow_days=7

    Returns:
      kpis              — Row 1: Active Residents, Today's Visitors, Pending Approvals, Security Alerts
      secondary_kpis    — Row 2: Collection Rate, Occupancy, Active Staff
      residents_chart   — 6-month resident growth line chart
      visitor_flow      — per-day counts for the past N days (7/30/90)
      recent_activity   — last 10 events sorted by time (check-ins, approvals, alerts)
      pending_approvals — top 5 pending approval requests for the widget
      live_visitors     — visitors currently inside or pending today
      staff_summary     — staff breakdown
      complaint_summary — complaint overview
    """
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        today            = timezone.localdate()
        now              = timezone.now()
        month_start      = today.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        last_month_end   = month_start - timedelta(days=1)

        # ── Society info ─────────────────────────────────────────────────────
        try:
            society     = Society.objects.get(pk=society_id)
            total_flats = society.total_flats or 0
        except Society.DoesNotExist:
            total_flats = 0

        # ── KPI Row 1 ─────────────────────────────────────────────────────────

        active_residents = UserProfile.objects.filter(
            society_id=society_id, status=UserProfile.Status.ACTIVE
        ).count()
        prev_active_residents = UserProfile.objects.filter(
            society_id=society_id,
            status=UserProfile.Status.ACTIVE,
            created_at__date__lte=last_month_end,
        ).count()

        today_visitors = Visitor.objects.filter(
            society_id=society_id, created_at__date=today
        ).count()
        last_month_visitors = Visitor.objects.filter(
            society_id=society_id,
            created_at__date__gte=last_month_start,
            created_at__date__lte=last_month_end,
        ).count()
        days_last_month    = (last_month_end - last_month_start).days + 1
        avg_daily_visitors = round(last_month_visitors / days_last_month) if days_last_month > 0 else 0

        pending_approvals = ApprovalRequest.objects.filter(
            society_id=society_id, status=ApprovalRequest.Status.PENDING
        ).count()
        prev_pending = ApprovalRequest.objects.filter(
            society_id=society_id,
            status=ApprovalRequest.Status.PENDING,
            created_at__date__lte=last_month_end,
        ).count()

        security_alerts = SecurityAlert.objects.filter(
            society_id=society_id,
            status__in=[SecurityAlert.Status.ACTIVE, SecurityAlert.Status.ACKNOWLEDGED],
        ).count()
        prev_alerts = SecurityAlert.objects.filter(
            society_id=society_id,
            status__in=[SecurityAlert.Status.ACTIVE, SecurityAlert.Status.ACKNOWLEDGED],
            triggered_at__date__lte=last_month_end,
        ).count()

        kpis = {
            "active_residents":     active_residents,
            "residents_change_pct": _pct_change(active_residents, prev_active_residents),
            "today_visitors":       today_visitors,
            "visitors_change_pct":  _pct_change(today_visitors, avg_daily_visitors),
            "pending_approvals":    pending_approvals,
            "approvals_change_pct": _pct_change(pending_approvals, prev_pending),
            "security_alerts":      security_alerts,
            "alerts_change_pct":    _pct_change(security_alerts, prev_alerts),
        }

        # ── KPI Row 2 ─────────────────────────────────────────────────────────

        # Collection Rate — paid dues / total dues this month
        month_dues  = MaintenanceDue.objects.filter(society_id=society_id, month=month_start)
        total_dues  = month_dues.count()
        paid_dues   = month_dues.filter(status=MaintenanceDue.Status.PAID).count()
        collection_rate_pct = round(paid_dues / total_dues * 100, 1) if total_dues else 0.0

        # Occupancy — unique flat_numbers with active residents vs total_flats
        occupied_flats = (
            UserProfile.objects
            .filter(
                society_id=society_id,
                role__slug="resident",
                status=UserProfile.Status.ACTIVE,
            )
            .exclude(flat_number="")
            .values("flat_number")
            .distinct()
            .count()
        )
        occupancy_pct = round(occupied_flats / total_flats * 100, 1) if total_flats else 0.0

        # Active Staff — all staff role profiles
        active_staff_count = UserProfile.objects.filter(
            society_id=society_id,
            role__slug__in=STAFF_ROLE_SLUGS,
            status=UserProfile.Status.ACTIVE,
        ).count()

        secondary_kpis = {
            "collection_rate_pct": collection_rate_pct,
            "collection_paid":     paid_dues,
            "collection_total":    total_dues,
            "occupancy_pct":       occupancy_pct,
            "occupied_flats":      occupied_flats,
            "total_flats":         total_flats,
            "active_staff":        active_staff_count,
        }

        # ── Residents 6-month Chart ───────────────────────────────────────────
        residents_chart = []
        for i in range(5, -1, -1):
            month_val = today.month - i
            year_val  = today.year
            while month_val <= 0:
                month_val += 12
                year_val  -= 1
            last_day       = calendar.monthrange(year_val, month_val)[1]
            month_end_date = date(year_val, month_val, last_day)
            count = UserProfile.objects.filter(
                society_id=society_id,
                role__slug="resident",
                created_at__date__lte=month_end_date,
            ).count()
            residents_chart.append({
                "month": date(year_val, month_val, 1).strftime("%b"),
                "count": count,
            })

        # ── Recent Activity ───────────────────────────────────────────────────
        activity_raw = []

        recent_visitors = (
            Visitor.objects
            .filter(society_id=society_id, status__in=[Visitor.Status.INSIDE, Visitor.Status.EXITED])
            .select_related("flat", "flat__building")
            .order_by("-checked_in_at")[:5]
        )
        for v in recent_visitors:
            flat_info = ""
            if v.flat:
                flat_info = v.flat.flat_number
                if v.flat.building_id:
                    flat_info = f"{v.flat.building.name} - {flat_info}"
            event_at     = v.checked_out_at or v.checked_in_at or v.created_at
            action_word  = "checked out" if v.status == Visitor.Status.EXITED else "checked in"
            activity_raw.append({
                "_ts":      event_at,
                "actor":    "Guard",
                "action":   f"{action_word} visitor",
                "subject":  f"{v.full_name} → {flat_info}",
                "time_ago": _time_ago(event_at, now),
                "event_type": "visitor",
            })

        recent_approvals = (
            ApprovalRequest.objects
            .filter(
                society_id=society_id,
                status__in=[ApprovalRequest.Status.APPROVED, ApprovalRequest.Status.REJECTED],
            )
            .select_related("reviewer")
            .order_by("-reviewed_at")[:3]
        )
        for apr in recent_approvals:
            reviewer = apr.reviewer.full_name if apr.reviewer_id else "Admin"
            sort_dt  = apr.reviewed_at or apr.updated_at
            activity_raw.append({
                "_ts":      sort_dt,
                "actor":    f"Admin - {reviewer}",
                "action":   apr.status,
                "subject":  apr.title,
                "time_ago": _time_ago(sort_dt, now),
                "event_type": "approval",
            })

        recent_alerts = (
            SecurityAlert.objects
            .filter(society_id=society_id)
            .order_by("-triggered_at")[:3]
        )
        for al in recent_alerts:
            activity_raw.append({
                "_ts":      al.triggered_at,
                "actor":    "System",
                "action":   "raised alert",
                "subject":  al.get_alert_type_display() + (f" — {al.gate}" if al.gate else ""),
                "time_ago": _time_ago(al.triggered_at, now),
                "event_type": "security",
            })

        recent_complaints = (
            Complaint.objects
            .filter(society_id=society_id)
            .select_related("resident", "flat", "flat__building")
            .order_by("-created_at")[:3]
        )
        for c in recent_complaints:
            flat_info = ""
            if c.flat_id:
                flat_info = c.flat.flat_number
                if c.flat.building_id:
                    flat_info = f"{c.flat.building.name} - {flat_info}"
            resident_name = c.resident.full_name if c.resident_id else "Resident"
            activity_raw.append({
                "_ts":      c.created_at,
                "actor":    f"Resident - {resident_name}",
                "action":   "raised complaint",
                "subject":  f"{c.title}" + (f" ({flat_info})" if flat_info else ""),
                "time_ago": _time_ago(c.created_at, now),
                "event_type": "complaint",
            })

        activity_raw.sort(key=lambda x: x["_ts"] or now, reverse=True)
        activity = [
            {k: v for k, v in item.items() if k != "_ts"}
            for item in activity_raw[:10]
        ]

        # ── Pending Approvals Widget ──────────────────────────────────────────
        pending_qs = (
            ApprovalRequest.objects
            .filter(society_id=society_id, status=ApprovalRequest.Status.PENDING)
            .select_related("requester")
            .order_by("-priority", "-created_at")[:5]
        )
        pending_widget = []
        for apr in pending_qs:
            requester_name = apr.requester.full_name if apr.requester_id else "Unknown"
            flat_info      = apr.requester.flat_number if apr.requester_id and apr.requester.flat_number else ""
            pending_widget.append({
                "id":        apr.pk,
                "title":     apr.title,
                "priority":  apr.priority,
                "stage":     apr.get_stage_display(),
                "requester": requester_name,
                "flat_info": flat_info,
            })

        # ── Live Visitors Widget ──────────────────────────────────────────────
        live_qs = (
            Visitor.objects
            .filter(
                society_id=society_id,
                status__in=[Visitor.Status.INSIDE, Visitor.Status.PENDING],
                created_at__date=today,
            )
            .select_related("flat", "flat__building")
            .order_by("-created_at")[:10]
        )
        live_widget = []
        for v in live_qs:
            flat_info = ""
            if v.flat:
                flat_info = (
                    f"{v.flat.building.name} - {v.flat.flat_number}"
                    if v.flat.building_id else v.flat.flat_number
                )
            ts = v.checked_in_at or v.created_at
            live_widget.append({
                "id":         v.pk,
                "full_name":  v.full_name,
                "visit_type": v.visit_type,
                "purpose":    v.purpose or "",
                "flat_info":  flat_info,
                "time":       ts.strftime("%H:%M"),
                "status":     v.status,
            })

        # ── Visitor Flow Chart ────────────────────────────────────────────────
        flow_days = min(int(request.query_params.get("flow_days", 7)), 90)
        flow = []
        for offset in range(flow_days - 1, -1, -1):
            day    = today - timedelta(days=offset)
            day_qs = Visitor.objects.filter(society_id=society_id, created_at__date=day)
            agg    = day_qs.aggregate(
                guest    = Count("id", filter=Q(visit_type=Visitor.VisitType.GUEST)),
                delivery = Count("id", filter=Q(visit_type=Visitor.VisitType.DELIVERY)),
                cab      = Count("id", filter=Q(visit_type=Visitor.VisitType.CAB)),
                service  = Count("id", filter=Q(visit_type=Visitor.VisitType.SERVICE)),
                other    = Count("id", filter=Q(visit_type=Visitor.VisitType.OTHER)),
                total    = Count("id"),
            )
            flow.append({"date": day, **agg})

        # ── Staff Summary ─────────────────────────────────────────────────────
        staff_qs  = StaffMember.objects.filter(society_id=society_id)
        staff_agg = staff_qs.aggregate(
            total    = Count("id"),
            guards   = Count("id", filter=Q(role=StaffMember.Role.SECURITY_GUARD)),
            hk       = Count("id", filter=Q(role=StaffMember.Role.HOUSEKEEPING)),
            maint    = Count("id", filter=Q(role=StaffMember.Role.MAINTENANCE)),
            on_leave = Count("id", filter=Q(status=StaffMember.Status.ON_LEAVE)),
        )
        staff_summary = {
            "total_staff":  staff_agg["total"],
            "guards":       staff_agg["guards"],
            "housekeeping": staff_agg["hk"],
            "maintenance":  staff_agg["maint"],
            "on_leave":     staff_agg["on_leave"],
        }

        # ── Complaint Summary ─────────────────────────────────────────────────
        cutoff_30d = now - timedelta(days=30)
        comp_qs    = Complaint.objects.filter(society_id=society_id)
        comp_agg   = comp_qs.aggregate(
            open_count    = Count("id", filter=Q(status=Complaint.Status.OPEN)),
            in_progress   = Count("id", filter=Q(status=Complaint.Status.IN_PROGRESS)),
            resolved_30d  = Count("id", filter=Q(
                status=Complaint.Status.RESOLVED,
                resolved_at__gte=cutoff_30d,
            )),
            high_priority = Count("id", filter=Q(
                priority__in=[Complaint.Priority.HIGH, Complaint.Priority.URGENT],
                status__in=[Complaint.Status.OPEN, Complaint.Status.IN_PROGRESS],
            )),
        )
        complaint_summary = {
            "open":          comp_agg["open_count"],
            "in_progress":   comp_agg["in_progress"],
            "resolved_30d":  comp_agg["resolved_30d"],
            "high_priority": comp_agg["high_priority"],
        }

        data = {
            "kpis":              kpis,
            "secondary_kpis":    secondary_kpis,
            "residents_chart":   residents_chart,
            "staff_summary":     staff_summary,
            "complaint_summary": complaint_summary,
            "recent_activity":   activity,
            "pending_approvals": pending_widget,
            "live_visitors":     live_widget,
            "visitor_flow":      flow,
        }

        logger.info(
            "SOCIETY_DASHBOARD | society=%s | residents=%d visitors=%d pending=%d alerts=%d",
            society_id, active_residents, today_visitors, pending_approvals, security_alerts,
        )
        return Response({"success": True, "data": SocietyDashboardSerializer(data).data})
