import csv
import io
import logging

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.society_admin.visitors.models import Visitor

from .models import GateEntry
from .serializers import EntryExitLogSerializer, GateEntryCreateSerializer, GateEntrySerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _flat_display(flat):
    if not flat:
        return ""
    building = flat.building
    if building and building.name:
        parts  = building.name.strip().split()
        prefix = parts[-1] if len(parts) > 1 else parts[0]
        return f"{prefix}-{flat.flat_number}"
    return flat.flat_number


def _visitor_to_row(v: Visitor) -> dict:
    return {
        "id":                v.pk,
        "visitor_name":      v.full_name,
        "mobile":            v.mobile,
        "visit_type":        v.visit_type,
        "visit_type_display": v.get_visit_type_display(),
        "flat_display":      _flat_display(v.flat),
        "host_name":         v.host_name or "",
        "purpose":           v.purpose or "",
        "vehicle_number":    v.vehicle_number or "",
        "checked_in_at":     v.checked_in_at,
        "checked_out_at":    v.checked_out_at,
        "status":            v.status,
        "status_display":    v.get_status_display(),
    }


class GateEntryPagination(PageNumberPagination):
    page_size             = 50
    page_size_query_param = "page_size"
    max_page_size         = 200


class GateEntryViewSet(viewsets.ViewSet):
    """
    Gate Entry log — record who enters or exits the society gate.

    GET    /api/security-guard/gate-entry/
    POST   /api/security-guard/gate-entry/
    GET    /api/security-guard/gate-entry/<id>/
    GET    /api/security-guard/gate-entry/summary/
    """
    permission_classes = [IsSecurityGuard]

    def _sid(self, request):
        try:
            return request.user.profile.society_id
        except Exception:
            return None

    def list(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            GateEntry.objects
            .filter(society_id=society_id)
            .select_related("processed_by")
            .order_by("-logged_at")
        )

        entry_type = request.query_params.get("entry_type")
        direction  = request.query_params.get("direction")
        date_str   = request.query_params.get("date")
        search     = request.query_params.get("search")

        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        if direction:
            qs = qs.filter(direction=direction)
        if date_str:
            qs = qs.filter(logged_at__date=date_str)
        if search:
            qs = qs.filter(
                Q(visitor_name__icontains=search)
                | Q(vehicle_number__icontains=search)
                | Q(mobile__icontains=search)
            )

        paginator = GateEntryPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(GateEntrySerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": GateEntrySerializer(qs, many=True).data})

    def create(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = GateEntryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        entry = ser.save(
            society_id=society_id,
            processed_by=request.user.profile,
        )
        logger.info(
            "GATE_ENTRY_LOG | id=%s society=%s visitor='%s' type=%s dir=%s",
            entry.pk, society_id, entry.visitor_name, entry.entry_type, entry.direction,
        )
        return Response(
            {"success": True, "message": "Gate entry logged.", "data": GateEntrySerializer(entry).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        society_id = self._sid(request)
        try:
            entry = GateEntry.objects.select_related("processed_by").get(pk=pk, society_id=society_id)
        except GateEntry.DoesNotExist:
            return Response({"success": False, "message": "Entry not found."}, status=404)
        return Response({"success": True, "data": GateEntrySerializer(entry).data})

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """GET /api/security-guard/gate-entry/summary/ — today's breakdown by type"""
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()
        qs    = GateEntry.objects.filter(society_id=society_id, logged_at__date=today)

        breakdown = {et.value: qs.filter(entry_type=et.value).count() for et in GateEntry.EntryType}

        # Visitor-based KPIs (live gate status from Visitor model)
        visitor_qs    = Visitor.objects.filter(society_id=society_id, created_at__date=today)
        inside_count  = visitor_qs.filter(status=Visitor.Status.INSIDE).count()
        exited_count  = visitor_qs.filter(status=Visitor.Status.EXITED).count()
        rejected_count = visitor_qs.filter(status=Visitor.Status.REJECTED).count()
        entries_in    = qs.filter(direction=GateEntry.Direction.IN).count()
        entries_out   = qs.filter(direction=GateEntry.Direction.OUT).count()

        return Response({
            "success": True,
            "data": {
                "date":          str(today),
                "total":         qs.count(),
                "entries":       entries_in,
                "exits":         entries_out,
                "inside":        inside_count,
                "exited":        exited_count,
                "rejected":      rejected_count,
                "by_entry_type": breakdown,
            },
        })


# ─────────────────────────────────────────────────────────────────────────────
# Entry / Exit Log  (reads from Visitor model — today's gate movements)
# ─────────────────────────────────────────────────────────────────────────────

class EntryExitLogView(APIView):
    """
    GET /api/security-guard/gate-entry/log/

    Today's gate movements — visitors who are currently INSIDE or have EXITED.
    Shows paired check-in / check-out times.

    Query params:
      ?search=<name, mobile, or flat>
      ?visit_type=guest|delivery|cab|service|other
      ?status=inside|exited
      ?date=YYYY-MM-DD   (defaults to today)
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        date_str = request.query_params.get("date", "")
        if date_str:
            try:
                from datetime import date
                log_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            log_date = timezone.localdate()

        qs = (
            Visitor.objects
            .filter(
                society_id=society_id,
                created_at__date=log_date,
                status__in=[Visitor.Status.INSIDE, Visitor.Status.EXITED, Visitor.Status.REJECTED],
            )
            .select_related("flat", "flat__building")
            .order_by("-created_at")
        )

        search        = request.query_params.get("search", "").strip()
        visit_type    = request.query_params.get("visit_type", "")
        status_filter = request.query_params.get("status", "")

        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(mobile__icontains=search)
                | Q(flat__flat_number__icontains=search)
            )
        if visit_type:
            qs = qs.filter(visit_type=visit_type)
        if status_filter:
            qs = qs.filter(status=status_filter)

        rows = [_visitor_to_row(v) for v in qs]

        logger.info(
            "ENTRY_EXIT_LOG | society=%s date=%s count=%d by=%s",
            society_id, log_date, len(rows), request.user.pk,
        )
        inside_count   = sum(1 for r in rows if r["status"] == Visitor.Status.INSIDE)
        exited_count   = sum(1 for r in rows if r["status"] == Visitor.Status.EXITED)
        rejected_count = sum(1 for r in rows if r["status"] == Visitor.Status.REJECTED)

        return Response({
            "success":  True,
            "date":     str(log_date),
            "log_date": str(log_date),
            "count":    len(rows),
            "stats": {
                "inside":      inside_count,
                "exited":      exited_count,
                "rejected":    rejected_count,
                "total":       len(rows),
                # kept for backwards compatibility with frontend
                "checked_in":  inside_count,
                "checked_out": exited_count,
            },
            "results": EntryExitLogSerializer(rows, many=True).data,
        })


class EntryExitExportView(APIView):
    """
    GET /api/security-guard/gate-entry/log/export/

    Downloads today's entry/exit log as a CSV file.
    Supports the same filters as EntryExitLogView.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        date_str = request.query_params.get("date", "")
        log_date = timezone.localdate()
        if date_str:
            try:
                from datetime import date
                log_date = date.fromisoformat(date_str)
            except ValueError:
                pass

        qs = (
            Visitor.objects
            .filter(
                society_id=society_id,
                created_at__date=log_date,
                status__in=[Visitor.Status.INSIDE, Visitor.Status.EXITED, Visitor.Status.REJECTED],
            )
            .select_related("flat", "flat__building")
            .order_by("-created_at")
        )

        search        = request.query_params.get("search", "").strip()
        visit_type    = request.query_params.get("visit_type", "")
        status_filter = request.query_params.get("status", "")

        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(mobile__icontains=search)
                | Q(flat__flat_number__icontains=search)
            )
        if visit_type:
            qs = qs.filter(visit_type=visit_type)
        if status_filter:
            qs = qs.filter(status=status_filter)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Visitor Name", "Mobile", "Visit Type", "Flat",
            "Host", "Purpose", "Vehicle", "Checked In", "Checked Out", "Status",
        ])
        for v in qs:
            writer.writerow([
                v.full_name,
                v.mobile,
                v.get_visit_type_display(),
                _flat_display(v.flat),
                v.host_name or "",
                v.purpose or "",
                v.vehicle_number or "",
                str(timezone.localtime(v.checked_in_at)) if v.checked_in_at else "",
                str(timezone.localtime(v.checked_out_at)) if v.checked_out_at else "—",
                v.get_status_display(),
            ])

        filename = f"entry_exit_log_{log_date}.csv"
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        logger.info("ENTRY_EXIT_EXPORT | society=%s date=%s by=%s", society_id, log_date, request.user.pk)
        return response
