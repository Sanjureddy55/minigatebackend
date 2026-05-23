"""
Accountant — Payment Collection Views
======================================
All data is hard-scoped to the accountant's linked society.
society_id is read from request.user.profile.society_id — never from a query param.

Dues ViewSet
  GET    /dues/                   list (filters: ?month=YYYY-MM, ?status=, ?building=, ?flat=)
  POST   /dues/                   create a single due manually
  GET    /dues/{id}/              retrieve single due
  PATCH  /dues/{id}/              partial-update (amount, due_date, description)
  DELETE /dues/{id}/              delete an unpaid due
  POST   /dues/generate/          bulk-generate dues for every flat in the society
  POST   /dues/{id}/mark-paid/    mark a due as paid + auto-create a ResidentPayment record

Payments ViewSet
  GET    /payments/               list (filters: ?month=YYYY-MM, ?payment_type=, ?flat=)
  POST   /payments/               record a manual payment (cash / cheque / offline UPI)
  GET    /payments/{id}/          retrieve single payment receipt
  PATCH  /payments/{id}/          partial-update (description, payment_date, payment_method)
  DELETE /payments/{id}/          delete a payment record
"""

import logging
from datetime import date

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue, ResidentPayment
from apps.roles_permissions.models import UserProfile
from apps.society_admin.flats.models import Flat

from .serializers import (
    GenerateDuesSerializer,
    MaintenanceDueSerializer,
    MarkPaidSerializer,
    PendingDueSerializer,
    PendingDuesSummarySerializer,
    RecordPaymentSerializer,
    ResidentPaymentSerializer,
)

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sid(request):
    """Return society_id scoped to the authenticated accountant."""
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class _Pagination(PageNumberPagination):
    page_size             = 50
    page_size_query_param = "page_size"
    max_page_size         = 200


# ── Dues ViewSet ───────────────────────────────────────────────────────────────

class DuesViewSet(ViewSet):
    """
    Full REST interface for MaintenanceDue records scoped to accountant's society.
    """
    permission_classes = [IsAccountant]
    pagination_class   = _Pagination

    # ── GET /dues/ ─────────────────────────────────────────────────────────────
    def list(self, request):
        """
        List all dues for the society.

        Query params:
          ?month=YYYY-MM      filter by billing month
          ?status=pending|paid|overdue
          ?building=<uuid>    filter by building
          ?flat=<uuid>        filter by specific flat
          ?page=1
          ?page_size=50
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked to this account."}, status=400)

        qs = (
            MaintenanceDue.objects
            .filter(society_id=sid)
            .select_related("flat", "flat__building")
            .order_by("-month", "flat__building__name", "flat__flat_number")
        )

        month_str = request.query_params.get("month")
        if month_str:
            try:
                y, m = month_str.split("-")
                qs = qs.filter(month__year=int(y), month__month=int(m))
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        building_id = request.query_params.get("building")
        if building_id:
            qs = qs.filter(flat__building_id=building_id)

        flat_id = request.query_params.get("flat")
        if flat_id:
            qs = qs.filter(flat_id=flat_id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        data = MaintenanceDueSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── POST /dues/ ────────────────────────────────────────────────────────────
    def create(self, request):
        """
        Create a single due manually for one flat.

        Request body:
          {
            "flat": "<uuid>",
            "month": "2026-05-01",
            "amount": 3500,
            "due_date": "2026-05-10",
            "description": "Monthly Maintenance"
          }
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        data = request.data.copy()
        data["society"] = sid
        ser = MaintenanceDueSerializer(data=data)
        ser.is_valid(raise_exception=True)
        due = ser.save(society_id=sid)
        logger.info("DUE_CREATE | id=%s flat=%s month=%s amount=%s by=%s",
                    due.pk, due.flat_id, due.month, due.amount, request.user)
        return Response(
            {"success": True, "message": "Due created.", "data": MaintenanceDueSerializer(due).data},
            status=status.HTTP_201_CREATED,
        )

    # ── GET /dues/{id}/ ────────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """Retrieve a single due by ID."""
        sid = _sid(request)
        try:
            due = (
                MaintenanceDue.objects
                .select_related("flat", "flat__building")
                .get(pk=pk, society_id=sid)
            )
        except MaintenanceDue.DoesNotExist:
            return Response({"detail": "Due not found."}, status=404)
        return Response({"success": True, "data": MaintenanceDueSerializer(due).data})

    # ── PATCH /dues/{id}/ ──────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """
        Partial update a due (amount, due_date, description).
        Cannot change a due that is already PAID.

        Request body (all optional):
          { "amount": 3800, "due_date": "2026-05-15", "description": "Revised amount" }
        """
        sid = _sid(request)
        try:
            due = MaintenanceDue.objects.select_related("flat", "flat__building").get(pk=pk, society_id=sid)
        except MaintenanceDue.DoesNotExist:
            return Response({"detail": "Due not found."}, status=404)

        if due.status == MaintenanceDue.Status.PAID:
            return Response({"success": False, "message": "Cannot edit a paid due."}, status=400)

        ser = MaintenanceDueSerializer(due, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        due = ser.save()
        logger.info("DUE_UPDATE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": MaintenanceDueSerializer(due).data})

    # ── DELETE /dues/{id}/ ─────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        Delete a due. Only unpaid (pending / overdue) dues can be deleted.
        """
        sid = _sid(request)
        try:
            due = MaintenanceDue.objects.get(pk=pk, society_id=sid)
        except MaintenanceDue.DoesNotExist:
            return Response({"detail": "Due not found."}, status=404)

        if due.status == MaintenanceDue.Status.PAID:
            return Response({"success": False, "message": "Cannot delete a paid due."}, status=400)

        due.delete()
        logger.warning("DUE_DELETE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "message": "Due deleted."})

    # ── POST /dues/generate/ ───────────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        """
        Bulk-generate one MaintenanceDue per flat for a given month.
        Flats that already have a due for that month are skipped (idempotent).

        Request body:
          {
            "year": 2026,
            "month": 6,
            "amount": 3500,
            "due_day": 10,          // day of month for due_date (default 10)
            "description": "Monthly Maintenance"
          }

        Response:
          { "success": true, "created": 42, "skipped": 3, "message": "..." }
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        ser = GenerateDuesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        year, month, amount = d["year"], d["month"], d["amount"]
        due_day     = d.get("due_day", 10)
        desc        = d.get("description", "Monthly Maintenance")
        month_start = date(year, month, 1)
        due_date    = date(year, month, due_day)

        flats = list(Flat.objects.filter(building__society_id=sid))
        if not flats:
            return Response({"success": False, "message": "No flats found in this society."}, status=400)

        existing_flat_ids = set(
            MaintenanceDue.objects
            .filter(society_id=sid, month=month_start)
            .values_list("flat_id", flat=True)
        )

        dues_to_create, skipped = [], 0
        for flat in flats:
            if flat.id in existing_flat_ids:
                skipped += 1
                continue
            dues_to_create.append(MaintenanceDue(
                flat=flat,
                society_id=sid,
                month=month_start,
                amount=amount,
                status=MaintenanceDue.Status.PENDING,
                due_date=due_date,
                description=desc,
            ))

        with transaction.atomic():
            MaintenanceDue.objects.bulk_create(dues_to_create)

        created = len(dues_to_create)
        logger.info("DUES_GENERATE | society=%s month=%s-%02d amount=%s created=%d skipped=%d by=%s",
                    sid, year, month, amount, created, skipped, request.user)
        return Response({
            "success": True,
            "message": f"Generated {created} dues for {month_start.strftime('%B %Y')}. {skipped} already existed.",
            "created": created,
            "skipped": skipped,
        }, status=status.HTTP_201_CREATED)

    # ── POST /dues/{id}/mark-paid/ ─────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        """
        Mark a due as PAID and auto-create a ResidentPayment audit record.

        Request body:
          {
            "payment_method": "upi",           // cash | upi | bank_transfer | cheque
            "payment_date": "2026-05-15",       // optional, defaults to today
            "description": ""                   // optional
          }

        Response:
          {
            "success": true,
            "message": "Due marked as paid.",
            "due": { ...MaintenanceDue fields... },
            "payment_id": 42
          }
        """
        sid = _sid(request)
        try:
            due = (
                MaintenanceDue.objects
                .select_related("flat", "flat__building")
                .get(pk=pk, society_id=sid)
            )
        except MaintenanceDue.DoesNotExist:
            return Response({"detail": "Due not found."}, status=404)

        if due.status == MaintenanceDue.Status.PAID:
            return Response({"success": False, "message": "Due is already paid."}, status=400)

        ser = MarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        payment_date = d.get("payment_date") or timezone.localdate()

        with transaction.atomic():
            due.status  = MaintenanceDue.Status.PAID
            due.paid_at = timezone.now()
            due.save(update_fields=["status", "paid_at"])

            # Try to get the flat's active resident for the payment record
            resident = (
                UserProfile.objects
                .filter(society_id=sid, flat_number=due.flat.flat_number, status=UserProfile.Status.ACTIVE)
                .first()
            ) or request.user.profile

            payment = ResidentPayment.objects.create(
                flat=due.flat,
                resident=resident,
                society_id=sid,
                maintenance_due=due,
                payment_type=ResidentPayment.PaymentType.MAINTENANCE,
                payment_method=d["payment_method"],
                amount=due.amount,
                description=d.get("description", ""),
                payment_date=payment_date,
            )

        logger.info("DUE_MARK_PAID | due=%s flat=%s amount=%s by=%s", pk, due.flat_id, due.amount, request.user)
        return Response({
            "success":    True,
            "message":    "Due marked as paid.",
            "due":        MaintenanceDueSerializer(due).data,
            "payment_id": payment.id,
        })


# ── Payments ViewSet ───────────────────────────────────────────────────────────

class PaymentsViewSet(ViewSet):
    """
    Full REST interface for ResidentPayment records scoped to accountant's society.
    """
    permission_classes = [IsAccountant]
    pagination_class   = _Pagination

    # ── GET /payments/ ─────────────────────────────────────────────────────────
    def list(self, request):
        """
        List all payment records for the society.

        Query params:
          ?month=YYYY-MM            filter by payment_date month
          ?payment_type=maintenance|fundraiser|penalty|other
          ?payment_method=cash|upi|bank_transfer|cheque
          ?flat=<uuid>              filter by flat
          ?resident=<id>            filter by resident profile id
          ?page=1
          ?page_size=50
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid)
            .select_related("flat", "flat__building", "resident")
            .order_by("-payment_date", "-created_at")
        )

        month_str = request.query_params.get("month")
        if month_str:
            try:
                y, m = month_str.split("-")
                qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)

        if ptype := request.query_params.get("payment_type"):
            qs = qs.filter(payment_type=ptype)
        if method := request.query_params.get("payment_method"):
            qs = qs.filter(payment_method=method)
        if flat_id := request.query_params.get("flat"):
            qs = qs.filter(flat_id=flat_id)
        if resident_id := request.query_params.get("resident"):
            qs = qs.filter(resident_id=resident_id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        data = ResidentPaymentSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── POST /payments/ ────────────────────────────────────────────────────────
    def create(self, request):
        """
        Record a manual payment (cash / cheque / offline UPI).

        Request body:
          {
            "flat": "<uuid>",
            "resident": <profile_id>,
            "payment_type": "maintenance",      // maintenance | fundraiser | penalty | other
            "payment_method": "cash",           // cash | upi | bank_transfer | cheque
            "amount": 3500.00,
            "payment_date": "2026-05-15",       // optional, defaults to today
            "description": "",                  // optional
            "maintenance_due": <due_id>         // optional, links to a MaintenanceDue
          }
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        ser = RecordPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            flat = Flat.objects.get(pk=d["flat"], building__society_id=sid)
        except Flat.DoesNotExist:
            return Response({"success": False, "message": "Flat not found in this society."}, status=400)

        try:
            resident = UserProfile.objects.get(pk=d["resident"], society_id=sid)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Resident not found in this society."}, status=400)

        maintenance_due = None
        if d.get("maintenance_due"):
            try:
                maintenance_due = MaintenanceDue.objects.get(pk=d["maintenance_due"], flat=flat)
            except MaintenanceDue.DoesNotExist:
                pass

        payment = ResidentPayment.objects.create(
            flat=flat,
            resident=resident,
            society_id=sid,
            maintenance_due=maintenance_due,
            payment_type=d["payment_type"],
            payment_method=d["payment_method"],
            amount=d["amount"],
            description=d.get("description", ""),
            payment_date=d.get("payment_date") or timezone.localdate(),
        )

        logger.info("PAYMENT_RECORD | id=%s flat=%s amount=%s type=%s by=%s",
                    payment.id, flat.flat_number, payment.amount, payment.payment_type, request.user)
        return Response(
            {"success": True, "message": "Payment recorded.", "data": ResidentPaymentSerializer(payment).data},
            status=status.HTTP_201_CREATED,
        )

    # ── GET /payments/{id}/ ────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """Retrieve a single payment record / receipt."""
        sid = _sid(request)
        try:
            payment = (
                ResidentPayment.objects
                .select_related("flat", "flat__building", "resident", "maintenance_due")
                .get(pk=pk, society_id=sid)
            )
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=404)
        return Response({"success": True, "data": ResidentPaymentSerializer(payment).data})

    # ── PATCH /payments/{id}/ ──────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """
        Partial update a payment record.
        Allowed fields: description, payment_date, payment_method.

        Request body (all optional):
          { "description": "Corrected entry", "payment_method": "cheque" }
        """
        sid = _sid(request)
        try:
            payment = ResidentPayment.objects.select_related("flat", "resident").get(pk=pk, society_id=sid)
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=404)

        allowed = {k: v for k, v in request.data.items() if k in ("description", "payment_date", "payment_method")}
        if not allowed:
            return Response({"success": False, "message": "No editable fields provided. Allowed: description, payment_date, payment_method."}, status=400)

        ser = ResidentPaymentSerializer(payment, data=allowed, partial=True)
        ser.is_valid(raise_exception=True)
        payment = ser.save()
        logger.info("PAYMENT_UPDATE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": ResidentPaymentSerializer(payment).data})

    # ── DELETE /payments/{id}/ ─────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        Delete a payment record.
        If linked to a MaintenanceDue, also resets the due status back to PENDING.
        """
        sid = _sid(request)
        try:
            payment = ResidentPayment.objects.select_related("maintenance_due").get(pk=pk, society_id=sid)
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=404)

        with transaction.atomic():
            if payment.maintenance_due_id:
                MaintenanceDue.objects.filter(pk=payment.maintenance_due_id).update(
                    status=MaintenanceDue.Status.PENDING,
                    paid_at=None,
                )
            payment.delete()

        logger.warning("PAYMENT_DELETE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "message": "Payment deleted. Linked due reset to pending."})


# ── Pending Dues ViewSet ───────────────────────────────────────────────────────

class PendingDuesViewSet(ViewSet):
    """
    Pending Dues page — outstanding + overdue dues for the accountant's society.

    GET  /pending-dues/              KPI summary + paginated list
                                     Filters: ?search=, ?status=pending|overdue,
                                              ?building=<uuid>, ?month=YYYY-MM,
                                              ?ordering=due_date|-due_date|amount|-amount
    GET  /pending-dues/summary/      KPI cards only (no list)
    POST /pending-dues/{id}/mark-paid/   Mark a single due as paid
    POST /pending-dues/send-reminders/   (placeholder) log reminder action
    """
    permission_classes = [IsAccountant]
    pagination_class   = _Pagination

    def _base_qs(self, sid):
        """Pending + overdue dues for the society, richly joined."""
        return (
            MaintenanceDue.objects
            .filter(
                society_id=sid,
                status__in=[MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE],
            )
            .select_related("flat", "flat__building")
            .order_by("due_date", "flat__building__name", "flat__flat_number")
        )

    def _resident_map(self, sid):
        """flat_number → full_name mapping for the society (one DB hit)."""
        return {
            up["flat_number"]: up["full_name"]
            for up in UserProfile.objects.filter(
                society_id=sid,
                status=UserProfile.Status.ACTIVE,
            ).values("flat_number", "full_name")
            if up["flat_number"]
        }

    # ── GET /pending-dues/ ─────────────────────────────────────────────────────
    def list(self, request):
        """
        Returns:
          summary   — KPI cards (defaulters, outstanding, overdue_60_days)
          results   — paginated list of pending/overdue dues

        Query params:
          ?search=A-101        searches flat_number and building_name
          ?status=pending      filter to only pending (default: both pending+overdue)
          ?status=overdue      filter to only overdue
          ?building=<uuid>     filter by building
          ?month=YYYY-MM       filter by billing month
          ?ordering=due_date   sort field (prefix - for desc, e.g. ?ordering=-amount)
          ?page=1
          ?page_size=50
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        today = timezone.localdate()
        qs    = self._base_qs(sid)

        # ── filters ─────────────────────────────────────────────────────────
        status_param = request.query_params.get("status")
        if status_param in ("pending", "overdue"):
            qs = qs.filter(status=status_param)

        building_id = request.query_params.get("building")
        if building_id:
            qs = qs.filter(flat__building_id=building_id)

        month_str = request.query_params.get("month")
        if month_str:
            try:
                y, m = month_str.split("-")
                qs = qs.filter(month__year=int(y), month__month=int(m))
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q as DQ
            qs = qs.filter(
                DQ(flat__flat_number__icontains=search) |
                DQ(flat__building__name__icontains=search)
            )

        ordering_map = {
            "due_date":  "due_date",
            "-due_date": "-due_date",
            "amount":    "amount",
            "-amount":   "-amount",
            "month":     "month",
            "-month":    "-month",
        }
        ordering = request.query_params.get("ordering", "due_date")
        qs = qs.order_by(ordering_map.get(ordering, "due_date"))

        # ── KPI summary (computed on full filtered set before pagination) ───
        import datetime
        from django.db.models import Count, Q, Sum
        agg = qs.aggregate(
            outstanding = Sum("amount"),
            defaulters  = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
        )

        overdue_60 = qs.filter(
            status=MaintenanceDue.Status.OVERDUE,
            due_date__lt=today - datetime.timedelta(days=60),
        ).values("flat_id").distinct().count()

        pending_count = qs.filter(status=MaintenanceDue.Status.PENDING).count()
        overdue_count = qs.filter(status=MaintenanceDue.Status.OVERDUE).count()

        summary = {
            "defaulters":      agg["defaulters"] or 0,
            "outstanding":     float(agg["outstanding"] or 0),
            "overdue_60_days": overdue_60,
            "pending_count":   pending_count,
            "overdue_count":   overdue_count,
        }

        # ── paginate list ────────────────────────────────────────────────────
        resident_map = self._resident_map(sid)
        paginator    = self.pagination_class()
        page         = paginator.paginate_queryset(qs, request)
        items        = page if page is not None else qs
        data         = PendingDueSerializer(items, many=True, context={"resident_map": resident_map}).data

        logger.info(
            "PENDING_DUES_LIST | society=%s defaulters=%d outstanding=%.0f overdue60=%d",
            sid, summary["defaulters"], summary["outstanding"], summary["overdue_60_days"],
        )

        if page is not None:
            resp = paginator.get_paginated_response(data)
            resp.data["summary"] = PendingDuesSummarySerializer(summary).data
            return resp

        return Response({
            "success": True,
            "summary": PendingDuesSummarySerializer(summary).data,
            "count":   len(data),
            "results": data,
        })

    # ── GET /pending-dues/summary/ ─────────────────────────────────────────────
    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        KPI cards only — no list.
        Used by the top-of-page summary cards.

        Returns:
          defaulters       — distinct flats with OVERDUE status
          outstanding      — total unpaid amount (pending + overdue)
          overdue_60_days  — distinct flats overdue > 60 days
          pending_count    — total PENDING due rows
          overdue_count    — total OVERDUE due rows
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        today = timezone.localdate()
        qs    = self._base_qs(sid)

        from django.db.models import Q, Sum, Count
        agg = qs.aggregate(
            outstanding = Sum("amount"),
            defaulters  = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
        )

        import datetime
        overdue_60 = qs.filter(
            status=MaintenanceDue.Status.OVERDUE,
            due_date__lt=today - datetime.timedelta(days=60),
        ).values("flat_id").distinct().count()

        summary = {
            "defaulters":      agg["defaulters"] or 0,
            "outstanding":     float(agg["outstanding"] or 0),
            "overdue_60_days": overdue_60,
            "pending_count":   qs.filter(status=MaintenanceDue.Status.PENDING).count(),
            "overdue_count":   qs.filter(status=MaintenanceDue.Status.OVERDUE).count(),
        }

        return Response({"success": True, "data": PendingDuesSummarySerializer(summary).data})

    # ── POST /pending-dues/{id}/mark-paid/ ─────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        """
        Mark a pending/overdue due as paid directly from the Pending Dues list.

        Request body:
          {
            "payment_method": "cash",       // cash | upi | bank_transfer | cheque
            "payment_date":   "2026-05-20", // optional, defaults to today
            "description":    ""            // optional
          }
        """
        sid = _sid(request)
        try:
            due = (
                MaintenanceDue.objects
                .select_related("flat", "flat__building")
                .get(pk=pk, society_id=sid)
            )
        except MaintenanceDue.DoesNotExist:
            return Response({"detail": "Due not found."}, status=404)

        if due.status == MaintenanceDue.Status.PAID:
            return Response({"success": False, "message": "Due is already paid."}, status=400)

        ser = MarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d            = ser.validated_data
        payment_date = d.get("payment_date") or timezone.localdate()

        with transaction.atomic():
            due.status  = MaintenanceDue.Status.PAID
            due.paid_at = timezone.now()
            due.save(update_fields=["status", "paid_at"])

            resident = (
                UserProfile.objects
                .filter(society_id=sid, flat_number=due.flat.flat_number, status=UserProfile.Status.ACTIVE)
                .first()
            ) or request.user.profile

            payment = ResidentPayment.objects.create(
                flat=due.flat,
                resident=resident,
                society_id=sid,
                maintenance_due=due,
                payment_type=ResidentPayment.PaymentType.MAINTENANCE,
                payment_method=d["payment_method"],
                amount=due.amount,
                description=d.get("description", ""),
                payment_date=payment_date,
            )

        logger.info("PENDING_DUE_PAID | due=%s flat=%s amount=%s by=%s", pk, due.flat_id, due.amount, request.user)
        return Response({
            "success":    True,
            "message":    f"Due for {due.flat.flat_number} marked as paid.",
            "due":        PendingDueSerializer(due, context={"resident_map": {}}).data,
            "payment_id": payment.id,
        })

    # ── POST /pending-dues/send-reminders/ ─────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="send-reminders")
    def send_reminders(self, request):
        """
        Send payment reminders to all defaulters.
        Currently logs the action — connect to SMS/email service as needed.

        Optional filter in body:
          { "status": "overdue" }   // "overdue" | "pending" | null (both)
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        status_filter = request.data.get("status")
        qs = self._base_qs(sid)
        if status_filter in ("pending", "overdue"):
            qs = qs.filter(status=status_filter)

        count = qs.values("flat_id").distinct().count()

        logger.info("SEND_REMINDERS | society=%s recipients=%d status=%s by=%s",
                    sid, count, status_filter or "all", request.user)

        return Response({
            "success": True,
            "message": f"Reminders queued for {count} flat(s).",
            "recipients": count,
        })
