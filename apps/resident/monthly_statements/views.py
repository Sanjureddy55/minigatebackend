"""
Resident — Monthly Statements (read-only, published only)
===========================================================
Base prefix: /api/resident/monthly-statements/

  GET  /                List published statements for resident's society
                        (?year=2026, ?page=1)
  GET  /{id}/           Statement detail (published only)
  GET  /{id}/download-pdf/  Download statement as PDF
"""

import logging

from django.http import HttpResponse
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsResident
from apps.society_admin.monthly_statements.models import MonthlyStatement
from apps.society_admin.monthly_statements.views import _generate_pdf

from .serializers import ResidentStatementSerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class _Pagination(PageNumberPagination):
    page_size             = 12
    page_size_query_param = "page_size"
    max_page_size         = 60


class ResidentStatementListView(APIView):
    """
    GET /api/resident/monthly-statements/
    Lists PUBLISHED statements for the resident's linked society.
    Residents never see draft statements.
    """
    permission_classes = [IsResident]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked to your account."}, status=400)

        qs = (
            MonthlyStatement.objects
            .filter(society_id=sid, is_published=True)
            .prefetch_related("uploaded_proofs")
            .select_related("society")
            .order_by("-month")
        )

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass

        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = ResidentStatementSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})


class ResidentStatementDetailView(APIView):
    """
    GET /api/resident/monthly-statements/{id}/
    Returns a single published statement for the resident's society.
    """
    permission_classes = [IsResident]

    def get(self, request, pk):
        sid = _sid(request)
        try:
            stmt = (
                MonthlyStatement.objects
                .prefetch_related("uploaded_proofs")
                .select_related("society")
                .get(pk=pk, society_id=sid, is_published=True)
            )
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Statement not found or not yet published."}, status=404)

        return Response({"success": True, "data": ResidentStatementSerializer(stmt).data})


class ResidentStatementPDFView(APIView):
    """
    GET /api/resident/monthly-statements/{id}/download-pdf/
    Residents can download the PDF for any published statement of their society.
    """
    permission_classes = [IsResident]

    def get(self, request, pk):
        sid = _sid(request)
        try:
            stmt = (
                MonthlyStatement.objects
                .prefetch_related("uploaded_proofs")
                .select_related("society")
                .get(pk=pk, society_id=sid, is_published=True)
            )
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Statement not found or not yet published."}, status=404)

        pdf_bytes = _generate_pdf(stmt)
        filename  = f"{stmt.society.name.replace(' ', '_')}_{stmt.month.strftime('%Y_%m')}_statement.pdf"
        response  = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        logger.info("RESIDENT_STMT_PDF | id=%s society=%s user=%s", stmt.pk, sid, request.user)
        return response
