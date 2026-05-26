import logging

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.society_admin.visitors.models import Visitor

from .serializers import SecurityDashboardSerializer

logger = logging.getLogger(__name__)


def _time_ago(dt) -> str:
    """Return human-readable relative time, e.g. '12 min ago', '2 hr ago'."""
    if not dt:
        return ""
    delta = timezone.now() - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds // 60} min ago"
    if seconds < 86400:
        return f"{seconds // 3600} hr ago"
    return f"{seconds // 86400} day ago"


class SecurityGuardDashboardView(APIView):
    """
    GET /api/security-guard/dashboard/

    Returns:
      - 4 KPI cards  (in_today, out_today, at_gate, active_alerts)
      - live_entries — last 10 GateEntry rows (for Live Entry/Exit table)
      - gate_status  — all society gates with assigned guard names
      - active_alerts_list — up to 5 active/acknowledged SecurityAlerts
      - shift context for the logged-in guard
    """
    permission_classes = [IsSecurityGuard]

    def _sid(self, request):
        try:
            return request.user.profile.society_id
        except Exception:
            return None

    # ── KPI helpers ──────────────────────────────────────────────────────────

    def _kpis(self, society_id, today):
        qs = Visitor.objects.filter(society_id=society_id)
        in_today  = qs.filter(checked_in_at__date=today).count()
        out_today = qs.filter(checked_out_at__date=today).count()
        at_gate   = qs.filter(status=Visitor.Status.INSIDE).count()
        pending   = qs.filter(status=Visitor.Status.PENDING).count()
        return in_today, out_today, at_gate, pending

    def _active_alerts_count(self, society_id):
        try:
            from apps.security_guard.emergency_alerts.models import EmergencyAlert
            return EmergencyAlert.objects.filter(
                society_id=society_id,
                status=EmergencyAlert.Status.ACTIVE,
            ).count()
        except Exception:
            return 0

    # ── Live Entry/Exit list ──────────────────────────────────────────────────

    def _live_entries(self, society_id):
        from apps.security_guard.gate_entry.models import GateEntry

        entries = (
            GateEntry.objects
            .filter(society_id=society_id)
            .order_by("-logged_at")[:10]
        )
        result = []
        for e in entries:
            result.append({
                "id":               e.pk,
                "visitor_name":     e.visitor_name,
                "flat_number":      e.flat_number or "—",
                "gate":             e.gate or "—",
                "time":             timezone.localtime(e.logged_at).strftime("%H:%M"),
                "entry_type":       e.entry_type,
                "entry_type_display": e.get_entry_type_display(),
                "direction":        e.direction,
            })
        return result

    # ── Gate status panel ─────────────────────────────────────────────────────

    def _gate_status(self, society_id, today):
        try:
            from apps.society_admin.security.models import Gate
            from apps.security_guard.shift_management.models import GuardShift

            gates = Gate.objects.filter(society_id=society_id)

            # Build a map: gate_name_lower → guard full_name (active shifts today)
            active_shifts = (
                GuardShift.objects
                .filter(
                    society_id=society_id,
                    shift_date=today,
                    status=GuardShift.Status.ACTIVE,
                )
                .select_related("guard")
            )
            gate_to_guard: dict[str, str] = {}
            for shift in active_shifts:
                key = (shift.gate_assigned or "").strip().lower()
                if key:
                    gate_to_guard[key] = shift.guard.full_name

            result = []
            for g in gates:
                guard_name = gate_to_guard.get(g.name.strip().lower())
                result.append({
                    "id":         g.pk,
                    "name":       g.name,
                    "status":     g.status,
                    "guard_name": guard_name,
                })
            return result
        except Exception:
            return []

    # ── Active alerts list ────────────────────────────────────────────────────

    def _alerts_list(self, society_id):
        try:
            from apps.security_guard.emergency_alerts.models import EmergencyAlert

            alerts = (
                EmergencyAlert.objects
                .filter(
                    society_id=society_id,
                    status__in=[
                        EmergencyAlert.Status.ACTIVE,
                        EmergencyAlert.Status.ACKNOWLEDGED,
                    ],
                )
                .select_related("raised_by")
                .order_by("-raised_at")[:5]
            )
            return [
                {
                    "id":          a.pk,
                    "alert_type":  a.alert_type,
                    "description": a.description or a.get_alert_type_display(),
                    "gate":        a.location or "",
                    "time_ago":    _time_ago(a.raised_at),
                    "status":      a.status,
                }
                for a in alerts
            ]
        except Exception:
            return []

    # ── Shift context ─────────────────────────────────────────────────────────

    def _shift_context(self, request, society_id, today):
        shift_status  = "off_duty"
        shift_start   = None
        gate_assigned = None
        try:
            from apps.security_guard.shift_management.models import GuardShift
            profile = request.user.profile
            shift = (
                GuardShift.objects
                .filter(guard=profile, society_id=society_id, shift_date=today)
                .order_by("start_time")
                .first()
            )
            if shift:
                shift_status  = shift.status
                shift_start   = shift.start_time
                gate_assigned = shift.gate_assigned
        except Exception:
            pass
        return shift_status, shift_start, gate_assigned

    # ── Main handler ──────────────────────────────────────────────────────────

    def get(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response(
                {"success": False, "message": "Guard profile has no linked society."},
                status=400,
            )

        today = timezone.localdate()

        in_today, out_today, at_gate, pending = self._kpis(society_id, today)
        active_alerts_count = self._active_alerts_count(society_id)
        shift_status, shift_start, gate_assigned = self._shift_context(
            request, society_id, today
        )

        payload = {
            # KPIs
            "in_today":      in_today,
            "out_today":     out_today,
            "at_gate":       at_gate,
            "active_alerts": active_alerts_count,

            # Shift
            "pending_approvals": pending,
            "shift_status":      shift_status,
            "shift_start":       shift_start,
            "gate_assigned":     gate_assigned,

            # Panels
            "live_entries":      self._live_entries(society_id),
            "gate_status":       self._gate_status(society_id, today),
            "active_alerts_list": self._alerts_list(society_id),
        }

        logger.info(
            "SECURITY_DASHBOARD | society=%s in=%d out=%d at_gate=%d alerts=%d",
            society_id, in_today, out_today, at_gate, active_alerts_count,
        )
        return Response({
            "success": True,
            "data": SecurityDashboardSerializer(payload).data,
        })
