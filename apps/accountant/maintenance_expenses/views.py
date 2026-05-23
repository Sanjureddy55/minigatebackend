"""
Maintenance Expenses (Accountant)
==================================
Base prefix: /api/accountant/maintenance-expenses/

  GET    /                  Paginated list
                            (?category, ?is_published, ?search, ?year, ?month, ?ordering)
  POST   /                  Create expense
  GET    /summary/          Category breakdown + totals
  GET    /{id}/             Retrieve single expense
  PATCH  /{id}/             Partial update
  DELETE /{id}/             Delete
  POST   /{id}/publish/     Mark is_published=True  (residents can see it)
  POST   /{id}/unpublish/   Mark is_published=False (draft)
  GET    /{id}/proof/       Return proof URL / redirect to proof document

Permissions: Accountant + Society Admin + Super Admin (IsAccountant covers all three)
"""

import logging

from django.db.models import Count, Q, Sum
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense

from .serializers import ExpenseSummarySerializer, MaintenanceExpenseSerializer

logger = logging.getLogger(__name__)

ALLOWED_ORDER = {"expense_date", "-expense_date", "amount", "-amount", "created_at", "-created_at"}


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class MaintenanceExpensesViewSet(ViewSet):
    """
    Accountant-scoped CRUD for MaintenanceExpense.
    Society is always derived from request.user.profile.society_id.
    """
    permission_classes = [IsAccountant]

    def _qs(self, sid):
        return (
            MaintenanceExpense.objects
            .filter(society_id=sid)
            .select_related("created_by")
            .order_by("-expense_date", "-created_at")
        )

    # ── list ──────────────────────────────────────────────────────────────────
    def list(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = self._qs(sid)

        category = request.query_params.get("category", "").strip()
        if category:
            qs = qs.filter(category=category)

        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(vendor_name__icontains=search)
                | Q(invoice_number__icontains=search)
                | Q(building_area__icontains=search)
                | Q(notes__icontains=search)
            )

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(expense_date__year=int(year))
            except ValueError:
                pass

        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(expense_date__year=int(y), expense_date__month=int(m))
            except (ValueError, AttributeError):
                pass

        ordering = request.query_params.get("ordering", "").strip()
        if ordering in ALLOWED_ORDER:
            qs = qs.order_by(ordering)

        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = MaintenanceExpenseSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── create ────────────────────────────────────────────────────────────────
    def create(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        ser = MaintenanceExpenseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(society_id=sid, created_by=request.user.profile)
        logger.info("ACCT_EXPENSE_CREATE | id=%s title='%s' amount=%s society=%s by=%s",
                    obj.pk, obj.title, obj.amount, sid, request.user)
        return Response(
            {"success": True, "message": "Expense recorded.", "data": MaintenanceExpenseSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    # ── retrieve ──────────────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({"success": True, "data": MaintenanceExpenseSerializer(obj).data})

    # ── partial_update ────────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        ser = MaintenanceExpenseSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("ACCT_EXPENSE_UPDATE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": MaintenanceExpenseSerializer(obj).data})

    # ── destroy ───────────────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        obj.delete()
        logger.info("ACCT_EXPENSE_DELETE | id=%s by=%s", pk, request.user)
        return Response({"success": True, "message": "Expense deleted."})

    # ── publish ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """POST /{id}/publish/ — make visible to residents."""
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        obj.is_published = True
        obj.save(update_fields=["is_published", "updated_at"])
        logger.info("ACCT_EXPENSE_PUBLISH | id=%s by=%s", pk, request.user)
        return Response({
            "success": True,
            "message": "Expense published. Residents can now see it.",
            "data": MaintenanceExpenseSerializer(obj).data,
        })

    # ── unpublish ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        """POST /{id}/unpublish/ — move back to Draft."""
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        obj.is_published = False
        obj.save(update_fields=["is_published", "updated_at"])
        return Response({
            "success": True,
            "message": "Expense moved to Draft.",
            "data": MaintenanceExpenseSerializer(obj).data,
        })

    # ── proof download ─────────────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="proof")
    def proof(self, request, pk=None):
        """
        GET /{id}/proof/

        If proof_url is an external URL → HTTP 302 redirect.
        Otherwise → return the proof_url in JSON so the frontend can handle it.
        Only Accountant and Society Admin can download proofs.
        """
        sid = _sid(request)
        try:
            obj = self._qs(sid).get(pk=pk)
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if not obj.proof_url or not obj.proof_url.strip():
            return Response({"success": False, "message": "No proof document attached."}, status=404)

        proof = obj.proof_url.strip()
        logger.info("ACCT_EXPENSE_PROOF | id=%s proof=%s by=%s", pk, proof, request.user)

        # If it looks like a URL, redirect to it
        if proof.startswith("http://") or proof.startswith("https://"):
            return HttpResponseRedirect(proof)

        # Otherwise return the filename/path for the frontend to resolve
        return Response({
            "success":  True,
            "proof_url": proof,
            "filename":  proof.split("/")[-1],
        })

    # ── summary ───────────────────────────────────────────────────────────────
    @action(detail=False, methods=["get"])
    def summary(self, request):
        """GET /summary/ — totals + category breakdown."""
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = self._qs(sid)
        agg = qs.aggregate(
            total   = Sum("amount"),
            pub_amt = Sum("amount", filter=Q(is_published=True)),
        )
        by_category = []
        for row in qs.values("category").annotate(count=Count("id"), total=Sum("amount")).order_by("-total"):
            row["total"] = float(row["total"] or 0)
            row["category_display"] = MaintenanceExpense(category=row["category"]).get_category_display()
            by_category.append(row)

        data = {
            "total_expenses":   qs.count(),
            "total_published":  qs.filter(is_published=True).count(),
            "total_draft":      qs.filter(is_published=False).count(),
            "amount_total":     float(agg["total"] or 0),
            "amount_published": float(agg["pub_amt"] or 0),
            "by_category":      by_category,
        }
        return Response({"success": True, "data": ExpenseSummarySerializer(data).data})
