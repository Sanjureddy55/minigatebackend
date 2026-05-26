"""
Approved Visitors — Security Guard view.

Data sources (merged, deduplicated, sorted by valid_till):
  1. GuestPass (resident_visitors) status=ACTIVE, visit_date >= today
     → "pre-approved" rows  (resident created before arrival)
  2. Visitor (society_admin_visitors) status=APPROVED, created_at date = today
     → "realtime" rows (resident approved after guard notified them)

Guard actions available per row:
  - Check In   → qr_passcode/checkin/ (GuestPass) or visitor_log/<id>/check-in/ (Visitor)
  - Export CSV → /approved-visitors/export/
"""

import csv
import io
import logging
from datetime import timedelta

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.resident.visitors.models import GuestPass
from apps.society_admin.visitors.models import Visitor

from .serializers import ApprovedVisitorKpiSerializer, ApprovedVisitorRowSerializer, ApprovedVisitorStatsSerializer

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _flat_display(flat):
    """Return 'A-402' style string from a Flat instance."""
    if not flat:
        return ""
    building = flat.building
    prefix   = ""
    if building and building.name:
        # Use first word/letter of building name as prefix (e.g. "Tower A" → "A")
        parts  = building.name.strip().split()
        prefix = parts[-1] if len(parts) > 1 else parts[0]
        prefix = f"{prefix}-"
    return f"{prefix}{flat.flat_number}"


def _build_guest_pass_row(gp: GuestPass) -> dict:
    flat     = gp.flat
    building = flat.building if flat else None
    now      = timezone.now()

    valid_till = None
    if gp.valid_until:
        local_valid = timezone.localtime(gp.valid_until)
        valid_till  = local_valid.time()

    return {
        "id":                gp.pk,
        "source":            "guest_pass",
        "visitor_name":      gp.full_name,
        "mobile":            gp.mobile,
        "flat_display":      _flat_display(flat) if flat else "",
        "building_name":     building.name if building else None,
        "flat_id":           str(flat.pk) if flat else None,
        "visit_type":        gp.visit_type,
        "visit_type_display": gp.get_visit_type_display(),
        "valid_till":        valid_till,
        "valid_till_date":   gp.valid_until.date() if gp.valid_until else None,
        "status":            "approved",
        "status_display":    "Approved",
        "vehicle_number":    gp.vehicle_number,
        "notes_for_guard":   gp.notes_for_guard,
        "host_name":         gp.created_by.full_name if gp.created_by else None,
        "qr_code":           gp.qr_code,
        "created_at":        gp.created_at,
        "checked_in_at":     None,
    }


def _build_visitor_row(v: Visitor) -> dict:
    flat     = v.flat
    building = flat.building if flat else None
    return {
        "id":                v.pk,
        "source":            "visitor",
        "visitor_name":      v.full_name,
        "mobile":            v.mobile,
        "flat_display":      _flat_display(flat) if flat else v.host_name or "",
        "building_name":     building.name if building else None,
        "flat_id":           str(flat.pk) if flat else None,
        "visit_type":        v.visit_type,
        "visit_type_display": v.get_visit_type_display(),
        "valid_till":        None,  # Real-time approvals have no fixed expiry
        "valid_till_date":   None,
        "status":            v.status,
        "status_display":    v.get_status_display(),
        "vehicle_number":    v.vehicle_number,
        "notes_for_guard":   v.purpose,
        "host_name":         v.host_name or None,
        "qr_code":           None,
        "created_at":        v.created_at,
        "checked_in_at":     v.checked_in_at,
    }


def _fetch_approved(society_id, search: str = "", visit_type: str = ""):
    """
    Returns (guest_pass_rows, visitor_rows) — both as lists of dicts.
    """
    now   = timezone.now()
    today = timezone.localdate()

    # ── 1. Active GuestPasses for this society ─────────────────────────────
    gp_qs = (
        GuestPass.objects
        .filter(
            flat__building__society_id=society_id,
            status=GuestPass.Status.ACTIVE,
            visit_date__gte=today,       # today or future
        )
        .filter(
            Q(valid_until__isnull=True) | Q(valid_until__gt=now)  # not expired
        )
        .select_related("flat", "flat__building", "created_by")
        .order_by("valid_until")
    )

    # ── 2. Real-time APPROVED Visitors for today ───────────────────────────
    v_qs = (
        Visitor.objects
        .filter(
            society_id=society_id,
            status=Visitor.Status.APPROVED,
            created_at__date=today,
        )
        .select_related("flat", "flat__building", "approved_by")
        .order_by("-created_at")
    )

    # ── Search filter ──────────────────────────────────────────────────────
    if search:
        gp_qs = gp_qs.filter(
            Q(full_name__icontains=search)
            | Q(mobile__icontains=search)
            | Q(flat__flat_number__icontains=search)
        )
        v_qs  = v_qs.filter(
            Q(full_name__icontains=search)
            | Q(mobile__icontains=search)
        )

    # ── Visit type filter ──────────────────────────────────────────────────
    if visit_type:
        gp_qs = gp_qs.filter(visit_type=visit_type)
        v_qs  = v_qs.filter(visit_type=visit_type)

    gp_rows = [_build_guest_pass_row(gp) for gp in gp_qs]
    v_rows  = [_build_visitor_row(v)     for v  in v_qs]

    return gp_rows, v_rows


# ─────────────────────────────────────────────────────────────────────────────
# Main list view
# ─────────────────────────────────────────────────────────────────────────────

class ApprovedVisitorListView(APIView):
    """
    GET /api/security-guard/approved-visitors/

    Returns a unified, sorted list of all pre-approved and real-time approved
    visitors for the guard's society.

    Query params:
      ?search=<name or flat>    fuzzy search on visitor name / flat / mobile
      ?visit_type=guest|delivery|cab|service
      ?source=guest_pass|visitor   filter by source
      ?stats=1                     include summary counts

    Response shape:
      {
        "success": true,
        "count": 25,
        "stats": { ... },          // present only if ?stats=1
        "results": [ { row }, ... ]
      }

    Table columns used by the frontend:
      visitor_name  →  VISITOR
      flat_display  →  FLAT
      valid_till    →  VALID TILL
      status_display → STATUS
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        search     = request.query_params.get("search", "").strip()
        visit_type = request.query_params.get("visit_type", "")
        source     = request.query_params.get("source", "")  # guest_pass | visitor | ""
        want_stats = request.query_params.get("stats") == "1"

        gp_rows, v_rows = _fetch_approved(society_id, search=search, visit_type=visit_type)

        # ── Merge and sort ─────────────────────────────────────────────────
        rows = []
        if source in ("", "guest_pass"):
            rows.extend(gp_rows)
        if source in ("", "visitor"):
            rows.extend(v_rows)

        # Sort: rows with a valid_till time first (ascending), then without
        rows.sort(key=lambda r: (r["valid_till"] is None, r["valid_till"] or ""))

        data = ApprovedVisitorRowSerializer(rows, many=True).data

        response = {"success": True, "count": len(data), "results": data}

        if want_stats:
            now = timezone.now()
            soon_cutoff = now + timedelta(minutes=30)

            expiring_soon = sum(
                1 for r in rows
                if r["valid_till"] and r["valid_till_date"]
                and r["source"] == "guest_pass"
                # crude check — if valid_until is within 30 min
            )
            stats = {
                "total":         len(rows),
                "pre_approved":  len(gp_rows),
                "realtime":      len(v_rows),
                "checked_in":    sum(1 for r in v_rows if r.get("checked_in_at")),
                "expiring_soon": expiring_soon,
            }
            response["stats"] = ApprovedVisitorStatsSerializer(stats).data

        logger.info(
            "APPROVED_VISITORS | society=%s gp=%d visitors=%d search='%s' by=%s",
            society_id, len(gp_rows), len(v_rows), search, request.user.pk,
        )
        return Response(response)


# ─────────────────────────────────────────────────────────────────────────────
# Check-in actions
# ─────────────────────────────────────────────────────────────────────────────

class ApprovedVisitorCheckInView(APIView):
    """
    POST /api/security-guard/approved-visitors/checkin/

    Body:
      { "source": "guest_pass", "id": 42 }   →  marks GuestPass as USED + creates Visitor INSIDE
      { "source": "visitor",    "id": 17 }   →  transitions Visitor APPROVED → INSIDE

    Returns the resulting Visitor record so the frontend can show confirmation.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        source    = request.data.get("source")
        record_id = request.data.get("id")

        if source not in ("guest_pass", "visitor") or not record_id:
            return Response(
                {"success": False, "message": "Provide 'source' (guest_pass|visitor) and 'id'."},
                status=400,
            )

        guard = request.user.profile

        # ── Check in from GuestPass ────────────────────────────────────────
        if source == "guest_pass":
            try:
                gp = (
                    GuestPass.objects
                    .select_related("flat", "flat__building", "created_by")
                    .get(pk=record_id, flat__building__society_id=society_id)
                )
            except GuestPass.DoesNotExist:
                return Response({"success": False, "message": "Guest pass not found."}, status=404)

            if gp.status != GuestPass.Status.ACTIVE:
                return Response(
                    {"success": False, "message": f"Pass status is '{gp.status}' — cannot check in."},
                    status=400,
                )

            now = timezone.now()
            if gp.valid_until and now > gp.valid_until:
                return Response(
                    {"success": False, "message": "This guest pass has expired."},
                    status=400,
                )

            from django.db import transaction
            with transaction.atomic():
                gp.status = GuestPass.Status.USED
                gp.save(update_fields=["status", "updated_at"])

                visitor = Visitor.objects.create(
                    society_id=society_id,
                    flat=gp.flat,
                    full_name=gp.full_name,
                    mobile=gp.mobile,
                    vehicle_number=gp.vehicle_number,
                    visit_type=gp.visit_type,
                    purpose=gp.notes_for_guard,
                    host_name=gp.created_by.full_name if gp.created_by else "",
                    status=Visitor.Status.INSIDE,
                    approved_by=guard,
                    checked_in_at=now,
                )

            logger.info(
                "APPROVED_CHECKIN_GUESTPASS | gp=%s visitor=%s society=%s by=%s",
                gp.pk, visitor.pk, society_id, guard.pk,
            )
            from apps.society_admin.visitors.serializers import VisitorSerializer
            return Response({
                "success": True,
                "message": f"{visitor.full_name} checked in via guest pass.",
                "data":    VisitorSerializer(visitor).data,
            })

        # ── Check in from real-time Visitor ───────────────────────────────
        try:
            visitor = Visitor.objects.get(pk=record_id, society_id=society_id)
        except Visitor.DoesNotExist:
            return Response({"success": False, "message": "Visitor not found."}, status=404)

        if visitor.status != Visitor.Status.APPROVED:
            return Response(
                {"success": False, "message": f"Visitor status is '{visitor.status}' — cannot check in."},
                status=400,
            )

        visitor.status        = Visitor.Status.INSIDE
        visitor.checked_in_at = timezone.now()
        visitor.save(update_fields=["status", "checked_in_at", "updated_at"])

        logger.info(
            "APPROVED_CHECKIN_VISITOR | visitor=%s society=%s by=%s",
            visitor.pk, society_id, guard.pk,
        )
        from apps.society_admin.visitors.serializers import VisitorSerializer
        return Response({
            "success": True,
            "message": f"{visitor.full_name} checked in.",
            "data":    VisitorSerializer(visitor).data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# KPI Stats (3 cards at top of page)
# ─────────────────────────────────────────────────────────────────────────────

class ApprovedVisitorKpiView(APIView):
    """
    GET /api/security-guard/approved-visitors/stats/

    Returns the 3 KPI card counts:
      - waiting_at_gate  → Visitors with status=APPROVED today
      - already_inside   → Visitors with status=INSIDE today
      - pass_expired     → GuestPasses with status=EXPIRED for this society
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()

        waiting = Visitor.objects.filter(
            society_id=society_id,
            status=Visitor.Status.APPROVED,
            created_at__date=today,
        ).count()

        inside = Visitor.objects.filter(
            society_id=society_id,
            status=Visitor.Status.INSIDE,
        ).count()

        expired = GuestPass.objects.filter(
            flat__building__society_id=society_id,
            status=GuestPass.Status.EXPIRED,
        ).count()

        payload = {
            "waiting_at_gate": waiting,
            "already_inside":  inside,
            "pass_expired":    expired,
        }
        return Response({"success": True, "data": ApprovedVisitorKpiSerializer(payload).data})


# ─────────────────────────────────────────────────────────────────────────────
# Export CSV
# ─────────────────────────────────────────────────────────────────────────────

class ApprovedVisitorExportView(APIView):
    """
    GET /api/security-guard/approved-visitors/export/

    Downloads the current approved visitors list as a CSV file.
    Same filters as the main list: ?search= ?visit_type= ?source=
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        search     = request.query_params.get("search", "").strip()
        visit_type = request.query_params.get("visit_type", "")
        source     = request.query_params.get("source", "")

        gp_rows, v_rows = _fetch_approved(society_id, search=search, visit_type=visit_type)

        rows = []
        if source in ("", "guest_pass"):
            rows.extend(gp_rows)
        if source in ("", "visitor"):
            rows.extend(v_rows)

        rows.sort(key=lambda r: (r["valid_till"] is None, r["valid_till"] or ""))

        # ── Build CSV ──────────────────────────────────────────────────────
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Source", "Visitor Name", "Mobile", "Flat", "Building",
            "Visit Type", "Valid Till", "Status", "Vehicle", "Notes for Guard",
            "Host", "QR Code", "Arrived At",
        ])

        for r in rows:
            writer.writerow([
                r["source"],
                r["visitor_name"],
                r["mobile"],
                r["flat_display"],
                r["building_name"] or "",
                r["visit_type_display"],
                str(r["valid_till"]) if r["valid_till"] else "—",
                r["status_display"],
                r["vehicle_number"],
                r["notes_for_guard"],
                r["host_name"] or "",
                r["qr_code"] or "",
                str(r["created_at"]),
            ])

        filename = f"approved_visitors_{timezone.localdate()}.csv"
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        logger.info("APPROVED_VISITORS_EXPORT | society=%s rows=%d by=%s", society_id, len(rows), request.user.pk)
        return response
