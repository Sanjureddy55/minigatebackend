"""
Monthly Statements (Accountant)
================================
Base prefix: /api/accountant/monthly-statements/

  GET    /                      List  (?is_published, ?year, ?page)
  GET    /{id}/                 Statement detail
  POST   /generate/             Generate / re-generate a draft statement
                                Body: { year, month, opening_balance?, notes? }
  POST   /{id}/publish/         Publish → visible to residents
  POST   /{id}/unpublish/       Retract publication
  POST   /{id}/upload-proof/    Upload 1-10 PDF/image files  (multipart)
  DELETE /{id}/delete-proof/    Remove a proof document  ?doc_id=<id>
  GET    /{id}/download-pdf/    Download statement as PDF
  GET    /{id}/export-excel/    Download statement as Excel

Society is always derived from request.user.profile.society_id.
"""

import datetime
import logging
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.society_admin.monthly_statements.models import MonthlyStatement, StatementProofDocument
from apps.society_admin.monthly_statements.views import (
    _compute_live,
    _generate_excel,
    _generate_pdf,
    _make_summary,
    _prev_closing_balance,
)

from .serializers import StatementSerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _get_stmt(pk, sid):
    return (
        MonthlyStatement.objects
        .prefetch_related("uploaded_proofs")
        .select_related("society")
        .get(pk=pk, society_id=sid)
    )


class _Pagination(PageNumberPagination):
    page_size             = 12
    page_size_query_param = "page_size"
    max_page_size         = 60


class AccountantMonthlyStatementViewSet(ViewSet):
    """
    Full monthly-statement management for the accountant role.
    Same actions as Society Admin's ViewSet, but society is always
    read from request.user.profile.society_id (never from a query param).
    """
    permission_classes = [IsAccountant]

    # ── list ──────────────────────────────────────────────────────────────────
    def list(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MonthlyStatement.objects
            .filter(society_id=sid)
            .prefetch_related("uploaded_proofs")
            .select_related("society")
            .order_by("-month")
        )

        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass

        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = StatementSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── retrieve ──────────────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        sid = _sid(request)
        try:
            stmt = _get_stmt(pk, sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({"success": True, "data": StatementSerializer(stmt).data})

    # ── generate ──────────────────────────────────────────────────────────────
    @action(detail=False, methods=["post"])
    def generate(self, request):
        """
        POST /generate/
        Body: { "year": 2026, "month": 5, "opening_balance": null, "notes": "" }
        Society is injected automatically from the accountant's profile.
        Computes financials from live MaintenanceDue + MaintenanceExpense data.
        """
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        try:
            year  = int(request.data.get("year",  timezone.localdate().year))
            month = int(request.data.get("month", timezone.localdate().month))
        except (TypeError, ValueError):
            return Response({"success": False, "message": "year and month must be integers."}, status=400)

        if not (1 <= month <= 12):
            return Response({"success": False, "message": "month must be 1-12."}, status=400)

        month_start = datetime.date(year, month, 1)
        live = _compute_live(sid, year, month)

        # Allow manual override of totals
        total_collected = Decimal(str(request.data["total_collected"])) \
            if request.data.get("total_collected") is not None \
            else live["total_collected"]

        total_expenses = Decimal(str(request.data["total_expenses"])) \
            if request.data.get("total_expenses") is not None \
            else live["total_expenses"]

        opening_balance = Decimal(str(request.data["opening_balance"])) \
            if request.data.get("opening_balance") is not None \
            else _prev_closing_balance(sid, month_start)

        closing_balance = opening_balance + total_collected - total_expenses
        summary = _make_summary(opening_balance, total_collected, total_expenses)
        notes   = request.data.get("notes", "") or ""

        stmt, created = MonthlyStatement.objects.update_or_create(
            society_id=sid,
            month=month_start,
            defaults={
                "opening_balance": opening_balance,
                "total_collected": total_collected,
                "total_expenses":  total_expenses,
                "closing_balance": closing_balance,
                "proof_documents": live["proof_documents"],
                "summary":         summary,
                "notes":           notes,
                "generated_by":    request.user,
            },
        )

        verb = "generated" if created else "regenerated"
        logger.info(
            "ACCT_STMT_%s | society=%s month=%s-%02d collected=%.0f expenses=%.0f by=%s",
            verb.upper(), sid, year, month,
            float(total_collected), float(total_expenses), request.user,
        )

        stmt_obj = _get_stmt(stmt.pk, sid)
        return Response(
            {"success": True, "message": f"Statement {verb} for {stmt.month_label}.", "data": StatementSerializer(stmt_obj).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    # ── publish ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        sid = _sid(request)
        try:
            stmt = MonthlyStatement.objects.get(pk=pk, society_id=sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if stmt.is_published:
            return Response({"success": False, "message": "Already published."}, status=400)

        stmt.is_published = True
        stmt.published_at = timezone.now()
        stmt.save(update_fields=["is_published", "published_at", "updated_at"])
        logger.info("ACCT_STMT_PUBLISH | id=%s month=%s by=%s", stmt.pk, stmt.month, request.user)
        return Response({
            "success": True,
            "message": f"Statement for {stmt.month_label} published. Residents can now see it.",
            "data":    StatementSerializer(_get_stmt(stmt.pk, sid)).data,
        })

    # ── unpublish ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        sid = _sid(request)
        try:
            stmt = MonthlyStatement.objects.get(pk=pk, society_id=sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if not stmt.is_published:
            return Response({"success": False, "message": "Not published."}, status=400)

        stmt.is_published = False
        stmt.published_at = None
        stmt.save(update_fields=["is_published", "published_at", "updated_at"])
        return Response({"success": True, "message": f"Statement for {stmt.month_label} retracted."})

    # ── upload proof ──────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="upload-proof", parser_classes=[MultiPartParser])
    def upload_proof(self, request, pk=None):
        """
        POST /{id}/upload-proof/   multipart/form-data  key=files
        Upload up to 10 PDF/image proof files.
        """
        sid = _sid(request)
        try:
            stmt = MonthlyStatement.objects.get(pk=pk, society_id=sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        files = request.FILES.getlist("files")
        if not files:
            return Response({"detail": "No files provided. Use key 'files' in form-data."}, status=400)
        if len(files) > 10:
            return Response({"detail": "Maximum 10 files per upload."}, status=400)

        docs = []
        for f in files:
            docs.append(StatementProofDocument.objects.create(
                statement=stmt,
                file=f,
                original_name=f.name,
                file_size=f.size,
                uploaded_by=request.user,
            ))

        logger.info("ACCT_STMT_PROOF_UPLOAD | stmt=%s files=%d by=%s", stmt.pk, len(docs), request.user)
        return Response({
            "success": True,
            "message": f"{len(docs)} file(s) uploaded.",
            "data":    StatementSerializer(_get_stmt(stmt.pk, sid)).data,
        }, status=status.HTTP_201_CREATED)

    # ── delete proof ──────────────────────────────────────────────────────────
    @action(detail=True, methods=["delete"], url_path="delete-proof")
    def delete_proof(self, request, pk=None):
        """DELETE /{id}/delete-proof/?doc_id=<id>"""
        sid = _sid(request)
        try:
            stmt = MonthlyStatement.objects.get(pk=pk, society_id=sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        doc_id = request.query_params.get("doc_id")
        if not doc_id:
            return Response({"detail": "doc_id query param required."}, status=400)

        try:
            doc = StatementProofDocument.objects.get(pk=doc_id, statement=stmt)
        except StatementProofDocument.DoesNotExist:
            return Response({"detail": "Proof document not found."}, status=404)

        doc.file.delete(save=False)
        doc.delete()
        logger.info("ACCT_STMT_PROOF_DELETE | stmt=%s doc=%s by=%s", stmt.pk, doc_id, request.user)
        return Response({"success": True, "message": "Proof document removed."})

    # ── download PDF ──────────────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="download-pdf")
    def download_pdf(self, request, pk=None):
        """GET /{id}/download-pdf/ — professionally formatted PDF."""
        sid = _sid(request)
        try:
            stmt = _get_stmt(pk, sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        pdf_bytes = _generate_pdf(stmt)
        filename  = f"{stmt.society.name.replace(' ', '_')}_{stmt.month.strftime('%Y_%m')}_statement.pdf"
        response  = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        logger.info("ACCT_STMT_PDF | id=%s by=%s", stmt.pk, request.user)
        return response

    # ── export Excel ──────────────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="export-excel")
    def export_excel(self, request, pk=None):
        """GET /{id}/export-excel/ — formatted .xlsx download."""
        sid = _sid(request)
        try:
            stmt = _get_stmt(pk, sid)
        except MonthlyStatement.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        xlsx_bytes = _generate_excel(stmt)
        filename   = f"{stmt.society.name.replace(' ', '_')}_{stmt.month.strftime('%Y_%m')}_statement.xlsx"
        response   = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        logger.info("ACCT_STMT_EXCEL | id=%s by=%s", stmt.pk, request.user)
        return response
