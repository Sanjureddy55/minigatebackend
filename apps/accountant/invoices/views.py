import logging

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import ResidentPayment

from .serializers import ReceiptSerializer

logger = logging.getLogger(__name__)


def _society_id(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class InvoiceListView(APIView):
    """
    GET /api/accountant/invoices/
    List payment receipts for the accountant's society.
    Filters: ?month=YYYY-MM, ?payment_type=maintenance, ?flat=<uuid>, ?resident=<id>
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _society_id(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid)
            .select_related("flat", "flat__building", "resident", "society", "maintenance_due")
            .order_by("-payment_date", "-created_at")
        )

        month_str = request.query_params.get("month")
        if month_str:
            try:
                y, m = month_str.split("-")
                qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)

        ptype = request.query_params.get("payment_type")
        if ptype:
            qs = qs.filter(payment_type=ptype)

        flat_id = request.query_params.get("flat")
        if flat_id:
            qs = qs.filter(flat_id=flat_id)

        resident_id = request.query_params.get("resident")
        if resident_id:
            qs = qs.filter(resident_id=resident_id)

        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = ReceiptSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})


class InvoiceDetailView(APIView):
    """
    GET /api/accountant/invoices/{id}/
    Single receipt detail.
    """
    permission_classes = [IsAccountant]

    def get(self, request, pk):
        sid = _society_id(request)
        try:
            payment = (
                ResidentPayment.objects
                .select_related("flat", "flat__building", "resident", "society", "maintenance_due")
                .get(pk=pk, society_id=sid)
            )
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Receipt not found."}, status=404)

        logger.info("RECEIPT_VIEW | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": ReceiptSerializer(payment).data})
