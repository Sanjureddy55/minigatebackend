"""
Track Payments ViewSet
======================
Base prefix: /api/accountant/track-payments/

  GET    /                 Paginated list of all payments for the society
  GET    /{id}/            Single payment detail
  GET    /summary/         Aggregate KPI cards
  GET    /export/          CSV download (same filters as list)

Query params (list + export):
  ?search=          flat_number / resident name / building
  ?month=           YYYY-MM
  ?status=          approved | pending
  ?payment_method=  cash | upi | bank_transfer | cheque
  ?payment_type=    maintenance | fundraiser | penalty | other
  ?building=        building name (case-insensitive)
  ?flat=            flat_number (exact)
  ?ordering=        payment_date | -payment_date | amount | -amount | created_at | -created_at
"""

import csv
import io
import logging
from datetime import date

from django.db.models import Q, Sum
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue, ResidentPayment

from .serializers import TrackPaymentSerializer, TrackPaymentSummarySerializer

logger = logging.getLogger(__name__)

ALLOWED_ORDER = {
    "payment_date", "-payment_date",
    "amount", "-amount",
    "created_at", "-created_at",
}


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _base_qs(sid):
    return (
        ResidentPayment.objects
        .filter(society_id=sid)
        .select_related("flat__building", "resident", "maintenance_due")
        .order_by("-created_at")
    )


def _apply_filters(qs, params):
    search = params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(flat__flat_number__icontains=search)
            | Q(flat__building__name__icontains=search)
            | Q(resident__full_name__icontains=search)
        )

    month = params.get("month", "").strip()
    if month:
        try:
            year, mon = month.split("-")
            qs = qs.filter(payment_date__year=int(year), payment_date__month=int(mon))
        except (ValueError, AttributeError):
            pass

    payment_method = params.get("payment_method", "").strip()
    if payment_method:
        qs = qs.filter(payment_method=payment_method)

    payment_type = params.get("payment_type", "").strip()
    if payment_type:
        qs = qs.filter(payment_type=payment_type)

    building = params.get("building", "").strip()
    if building:
        qs = qs.filter(flat__building__name__icontains=building)

    flat = params.get("flat", "").strip()
    if flat:
        qs = qs.filter(flat__flat_number=flat)

    ordering = params.get("ordering", "").strip()
    if ordering in ALLOWED_ORDER:
        qs = qs.order_by(ordering)

    return qs


def _apply_status_filter(payments, status_param):
    """
    status is derived in Python (not a DB column), so we filter post-fetch
    only when explicitly requested. To avoid loading the whole table into RAM,
    we pre-filter at the DB level for the two cases:

    approved → maintenance_due IS NULL  OR  maintenance_due.status = 'paid'
    pending  → maintenance_due IS NOT NULL AND maintenance_due.status != 'paid'
    """
    if status_param == "approved":
        return payments.filter(
            Q(maintenance_due__isnull=True)
            | Q(maintenance_due__status=MaintenanceDue.Status.PAID)
        )
    if status_param == "pending":
        return payments.filter(
            maintenance_due__isnull=False,
            maintenance_due__status__in=[
                MaintenanceDue.Status.PENDING,
                MaintenanceDue.Status.OVERDUE,
            ],
        )
    return payments


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class TrackPaymentsViewSet(ViewSet):
    permission_classes = [IsAccountant]

    # ── list ──────────────────────────────────────────────────────────────────
    def list(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _base_qs(sid)
        qs = _apply_filters(qs, request.query_params)
        qs = _apply_status_filter(qs, request.query_params.get("status", "").strip())

        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = TrackPaymentSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── retrieve ──────────────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        sid = _sid(request)
        try:
            payment = (
                ResidentPayment.objects
                .select_related("flat__building", "resident", "maintenance_due")
                .get(pk=pk, society_id=sid)
            )
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        return Response({"success": True, "data": TrackPaymentSerializer(payment).data})

    # ── summary ───────────────────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _base_qs(sid)
        qs = _apply_filters(qs, request.query_params)

        all_payments = list(qs.values("id", "amount", "maintenance_due_id", "maintenance_due__status"))

        total     = len(all_payments)
        approved  = sum(
            1 for p in all_payments
            if p["maintenance_due_id"] is None or p["maintenance_due__status"] == "paid"
        )
        pending   = total - approved

        today = date.today()
        this_month_total = float(
            qs.filter(payment_date__year=today.year, payment_date__month=today.month)
            .aggregate(s=Sum("amount"))["s"] or 0
        )

        by_method = {}
        for choice_val, choice_label in ResidentPayment.PaymentMethod.choices:
            agg = qs.filter(payment_method=choice_val).aggregate(s=Sum("amount"))["s"]
            if agg:
                by_method[choice_label] = float(agg)

        data = {
            "total_payments":   total,
            "approved_count":   approved,
            "pending_count":    pending,
            "this_month_total": this_month_total,
            "by_method":        by_method,
        }
        return Response({"success": True, "data": TrackPaymentSummarySerializer(data).data})

    # ── export CSV ────────────────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        from django.http import HttpResponse

        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _base_qs(sid)
        qs = _apply_filters(qs, request.query_params)
        qs = _apply_status_filter(qs, request.query_params.get("status", "").strip())

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "ID", "Flat", "Building", "Resident",
            "Type", "Method", "Amount",
            "Status", "Due Month",
            "Payment Date", "Description",
        ])

        serialized = TrackPaymentSerializer(qs, many=True).data
        for row in serialized:
            writer.writerow([
                row["id"],
                row["flat_number"],
                row["building_name"],
                row["resident_name"],
                row["payment_type_display"],
                row["payment_method_display"],
                row["amount"],
                row["status_display"],
                row.get("due_month") or "",
                row["payment_date"],
                row["description"],
            ])

        response = HttpResponse(buf.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="track_payments.csv"'
        return response
