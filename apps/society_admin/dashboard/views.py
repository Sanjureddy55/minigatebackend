import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.resident.complaints.models import Complaint
from apps.roles_permissions.models import UserProfile
from apps.society_admin.approvals.models import ApprovalRequest
from apps.society_admin.security.models import SecurityAlert
from apps.society_admin.staff_guards.models import StaffMember
from apps.society_admin.visitors.models import Visitor

from .serializers import SocietyDashboardSerializer
from apps.common.utils import get_society_id

logger = logging.getLogger(__name__)


def _pct_change(current: int, previous: int) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


class SocietyDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    """
    GET /api/society-admin/dashboard/?society=<id>&flow_days=7

    Returns:
      kpis              — Active Residents, Today's Visitors, Pending Approvals, Security Alerts
      recent_activity   — last 10 events (visitor check-ins, approvals, alerts)
      pending_approvals — top 5 pending approval requests for the widget
      live_visitors     — visitors currently inside or pending today
      visitor_flow      — per-day counts for the past N days (7/30/90)
    """

    def get(self, request):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        today        = timezone.localdate()
        now          = timezone.now()
        month_start  = today.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        last_month_end   = month_start - timedelta(days=1)

        # ── KPIs ─────────────────────────────────────────────────────────────

        # Active residents
        active_residents     = UserProfile.objects.filter(
            society_id=society_id, status=UserProfile.Status.ACTIVE
        ).count()
        prev_active_residents = UserProfile.objects.filter(
            society_id=society_id,
            status=UserProfile.Status.ACTIVE,
            created_at__date__lte=last_month_end,
        ).count()

        # Today's visitors
        today_visitors = Visitor.objects.filter(
            society_id=society_id, created_at__date=today
        ).count()
        last_month_visitors = Visitor.objects.filter(
            society_id=society_id,
            created_at__date__gte=last_month_start,
            created_at__date__lte=last_month_end,
        ).count()
        # Normalise to daily average for fair comparison
        days_last_month = (last_month_end - last_month_start).days + 1
        avg_daily_visitors = round(last_month_visitors / days_last_month) if days_last_month > 0 else 0

        # Pending approvals
        pending_approvals = ApprovalRequest.objects.filter(
            society_id=society_id, status=ApprovalRequest.Status.PENDING
        ).count()
        prev_pending = ApprovalRequest.objects.filter(
            society_id=society_id,
            status=ApprovalRequest.Status.PENDING,
            created_at__date__lte=last_month_end,
        ).count()

        # Security alerts (active + acknowledged)
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

        # ── Recent Activity ───────────────────────────────────────────────────
        activity = []

        def _mins(dt):
            delta = now - dt
            m = int(delta.total_seconds() // 60)
            if m < 60:
                return f"{m} min ago"
            h = m // 60
            if h < 24:
                return f"{h} hr ago"
            return f"{delta.days} days ago"

        # Recent check-ins / check-outs
        recent_visitors = (
            Visitor.objects
            .filter(society_id=society_id, status__in=[Visitor.Status.INSIDE, Visitor.Status.EXITED])
            .select_related("flat", "flat__building")
            .order_by("-checked_in_at")[:5]
        )
        for v in recent_visitors:
            flat_info = ""
            if v.flat:
                flat_info = f"{v.flat.flat_number}"
                if v.flat.building_id:
                    flat_info = f"{v.flat.building.name} - {flat_info}"
            event_at = v.checked_out_at or v.checked_in_at or v.created_at
            action_word = "checked out" if v.status == Visitor.Status.EXITED else "checked in"
            activity.append({
                "actor":      "Guard",
                "action":     f"{action_word} visitor",
                "subject":    f"{v.full_name} → {flat_info}",
                "time_ago":   _mins(event_at),
                "event_type": "visitor",
            })

        # Recent approvals
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
            activity.append({
                "actor":      f"Admin - {reviewer}",
                "action":     apr.status,
                "subject":    apr.title,
                "time_ago":   _mins(apr.reviewed_at or apr.updated_at),
                "event_type": "approval",
            })

        # Recent security alerts
        recent_alerts = (
            SecurityAlert.objects
            .filter(society_id=society_id)
            .order_by("-triggered_at")[:3]
        )
        for al in recent_alerts:
            activity.append({
                "actor":      "System",
                "action":     "raised alert",
                "subject":    al.get_alert_type_display() + (f" — {al.gate}" if al.gate else ""),
                "time_ago":   _mins(al.triggered_at),
                "event_type": "security",
            })

        # Recent complaints raised by residents
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
            activity.append({
                "actor":      f"Resident - {resident_name}",
                "action":     "raised complaint",
                "subject":    f"{c.complaint_number}: {c.title}" + (f" ({flat_info})" if flat_info else ""),
                "time_ago":   _mins(c.created_at),
                "event_type": "complaint",
            })

        # Sort combined activity by recency (approximate — strings, just keep order)
        activity = activity[:10]

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
            flat_info = apr.requester.flat_number if apr.requester_id and apr.requester.flat_number else ""
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
                flat_info = f"{v.flat.flat_number}"
                if v.flat.building_id:
                    flat_info = f"{v.flat.building.name} - {flat_info}"
            ts = v.checked_in_at or v.created_at
            live_widget.append({
                "id":        v.pk,
                "full_name": v.full_name,
                "visit_type": v.visit_type,
                "flat_info": flat_info,
                "time":      ts.strftime("%H:%M"),
                "status":    v.status,
            })

        # ── Visitor Flow Chart ────────────────────────────────────────────────
        flow_days = int(request.query_params.get("flow_days", 7))
        flow_days = min(flow_days, 90)

        flow = []
        for offset in range(flow_days - 1, -1, -1):
            day = today - timedelta(days=offset)
            day_qs = Visitor.objects.filter(society_id=society_id, created_at__date=day)
            agg = day_qs.aggregate(
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
        cutoff_30d  = now - timedelta(days=30)
        comp_qs     = Complaint.objects.filter(society_id=society_id)
        comp_agg    = comp_qs.aggregate(
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