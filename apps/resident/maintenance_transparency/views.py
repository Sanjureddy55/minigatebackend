import logging

from django.db.models import Sum
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from apps.common.utils import get_flat_id, get_society_id
from apps.resident.payments.models import MaintenanceDue, ResidentPayment
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense
from apps.society_admin.maintenance_expenses.serializers import PublishedExpenseSerializer

from .serializers import MaintenanceTransparencySerializer

logger = logging.getLogger(__name__)


class MaintenanceTransparencyView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/maintenance-transparency/?flat=<uuid>&society=<id>

    Returns:
      - My Maintenance Paid   (flat's total payments this year)
      - Society Collection    (total dues raised for all flats in society)
      - Amount Used           (sum of published expenses for society)
      - Remaining Balance     (Collection - Used)
      - Fund usage %
      - Published expense proofs (paginated, max 50)
    """

    def get(self, request):
        flat_id    = get_flat_id(request)
        society_id = get_society_id(request)

        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        today = timezone.localdate()

        # ── My Maintenance Paid (flat's total this year) ───────────────────────
        my_paid = 0.0
        if flat_id:
            my_paid = float(
                ResidentPayment.objects.filter(
                    flat_id=flat_id,
                    payment_type=ResidentPayment.PaymentType.MAINTENANCE,
                    payment_date__year=today.year,
                ).aggregate(total=Sum("amount"))["total"] or 0
            )

        # ── Society Collection (total dues raised for all flats) ───────────────
        society_collection = float(
            MaintenanceDue.objects.filter(
                society_id=society_id,
                status=MaintenanceDue.Status.PAID,
            ).aggregate(total=Sum("amount"))["total"] or 0
        )

        # ── Amount Used (published expenses) ──────────────────────────────────
        expense_qs  = MaintenanceExpense.objects.filter(society_id=society_id, is_published=True)
        amount_used = float(expense_qs.aggregate(total=Sum("amount"))["total"] or 0)

        # ── Remaining balance + usage % ───────────────────────────────────────
        remaining_balance = max(society_collection - amount_used, 0.0)
        fund_usage_pct    = round((amount_used / society_collection * 100), 1) if society_collection > 0 else 0.0

        # ── Published expense proofs ──────────────────────────────────────────
        expenses = expense_qs.order_by("-expense_date")[:50]
        published_expenses = PublishedExpenseSerializer(expenses, many=True).data

        data = {
            "my_maintenance_paid": my_paid,
            "society_collection":  society_collection,
            "amount_used":         amount_used,
            "remaining_balance":   remaining_balance,
            "fund_usage_pct":      fund_usage_pct,
            "published_expenses":  list(published_expenses),
        }

        logger.info(
            "TRANSPARENCY_VIEW | society=%s flat=%s collection=%.0f used=%.0f pct=%.1f%%",
            society_id, flat_id, society_collection, amount_used, fund_usage_pct,
        )
        return Response({
            "success": True,
            "data":    MaintenanceTransparencySerializer(data).data,
        })


class ExpenseProofDownloadView(APIView):
    """
    GET /api/resident/maintenance-transparency/expenses/{id}/proof/?society=<id>

    Residents can download proof documents ONLY for published expenses.
    Unpublished (draft) expenses are hidden from residents entirely.

    Behaviour:
      - proof_url is an http(s) URL → HTTP 302 redirect to the document
      - proof_url is a filename     → returns JSON with the filename so the
                                       frontend can resolve the storage URL
    """
    permission_classes = [IsResident]

    def get(self, request, pk):
        society_id = get_society_id(request)
        if not society_id:
            return Response({"success": False, "message": "society query param required."}, status=400)

        try:
            expense = MaintenanceExpense.objects.get(
                pk=pk,
                society_id=society_id,
                is_published=True,   # residents can only access published proofs
            )
        except MaintenanceExpense.DoesNotExist:
            return Response({"detail": "Proof not found or not yet published."}, status=404)

        if not expense.proof_url or not expense.proof_url.strip():
            return Response({"success": False, "message": "No proof document attached to this expense."}, status=404)

        proof = expense.proof_url.strip()
        logger.info("RESIDENT_PROOF_DOWNLOAD | expense=%s society=%s user=%s", pk, society_id, request.user)

        if proof.startswith("http://") or proof.startswith("https://"):
            return HttpResponseRedirect(proof)

        return Response({
            "success":   True,
            "proof_url": proof,
            "filename":  proof.split("/")[-1],
            "expense":   {
                "id":       expense.pk,
                "title":    expense.title,
                "category": expense.get_category_display(),
                "amount":   float(expense.amount),
                "date":     expense.expense_date,
            },
        })