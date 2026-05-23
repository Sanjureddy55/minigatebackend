"""
Generate Receipts (Accountant)
================================
Base prefix: /api/accountant/generate-receipts/

  GET  /                List payments  (?month, ?flat, ?resident, ?payment_type, ?search)
  GET  /{id}/           JSON receipt detail
  GET  /{id}/pdf/       Download a formatted PDF receipt  ← proper PDF (ReportLab)
  GET  /bulk-pdf/       Download all receipts as a single PDF  (?month, ?flat, ?payment_type)
  GET  /bulk-csv/       Bulk CSV of all receipts
"""

import io
import logging

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import ResidentPayment

from .serializers import ReceiptSerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _base_qs(sid):
    return (
        ResidentPayment.objects
        .filter(society_id=sid)
        .select_related("flat__building", "resident", "society", "maintenance_due")
        .order_by("-payment_date", "-created_at")
    )


def _apply_filters(qs, params):
    month = params.get("month", "").strip()
    if month:
        try:
            y, m = month.split("-")
            qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
        except (ValueError, AttributeError):
            pass

    flat = params.get("flat", "").strip()
    if flat:
        qs = qs.filter(flat__flat_number=flat)

    resident = params.get("resident", "").strip()
    if resident:
        qs = qs.filter(resident_id=resident)

    ptype = params.get("payment_type", "").strip()
    if ptype:
        qs = qs.filter(payment_type=ptype)

    search = params.get("search", "").strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(flat__flat_number__icontains=search)
            | Q(resident__full_name__icontains=search)
            | Q(flat__building__name__icontains=search)
        )

    return qs


def _build_receipt_pdf(payment) -> bytes:
    """Generate a single formatted PDF receipt using ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    p = payment
    receipt_number = f"RCPT-{p.pk:06d}"
    due_month = ""
    if p.maintenance_due_id:
        try:
            due_month = p.maintenance_due.month.strftime("%B %Y")
        except Exception:
            pass

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A5,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=15*mm, bottomMargin=15*mm,
    )

    styles = getSampleStyleSheet()
    BLUE = colors.HexColor("#1D4ED8")

    title_style   = ParagraphStyle("title",   parent=styles["Heading1"], fontSize=14, textColor=BLUE, spaceAfter=2)
    society_style = ParagraphStyle("society", parent=styles["Normal"],   fontSize=9,  textColor=colors.grey, spaceAfter=10)
    label_style   = ParagraphStyle("label",   parent=styles["Normal"],   fontSize=8,  textColor=colors.grey)
    value_style   = ParagraphStyle("value",   parent=styles["Normal"],   fontSize=10, fontName="Helvetica-Bold")
    footer_style  = ParagraphStyle("footer",  parent=styles["Normal"],   fontSize=8,  textColor=colors.grey, alignment=1)
    amount_style  = ParagraphStyle("amount",  parent=styles["Heading2"], fontSize=18, textColor=BLUE, spaceAfter=0)

    BORDER = colors.HexColor("#E5E7EB")
    LBLUE  = colors.HexColor("#EFF6FF")

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("PAYMENT RECEIPT", title_style))
    story.append(Paragraph(p.society.name, society_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=8))

    # ── Receipt meta row ──────────────────────────────────────────────────────
    meta = [
        [Paragraph(f"<b>Receipt No:</b> {receipt_number}", styles["Normal"]),
         Paragraph(f"<b>Date:</b> {p.payment_date.strftime('%d %b %Y')}", styles["Normal"])],
    ]
    meta_table = Table(meta, colWidths=[70*mm, 50*mm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LBLUE),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("BOX",        (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6*mm))

    # ── Resident details ──────────────────────────────────────────────────────
    story.append(Paragraph("Received From", label_style))
    story.append(Paragraph(p.resident.full_name, value_style))
    story.append(Paragraph(
        f"Flat {p.flat.flat_number} • {p.flat.building.name}",
        ParagraphStyle("flat", parent=styles["Normal"], fontSize=9, textColor=colors.grey),
    ))
    if p.resident.mobile:
        story.append(Paragraph(p.resident.mobile, ParagraphStyle("mob", parent=styles["Normal"], fontSize=9, textColor=colors.grey)))
    story.append(Spacer(1, 5*mm))

    # ── Amount ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("Amount Paid", label_style))
    story.append(Paragraph(f"₹ {p.amount:,.2f}", amount_style))
    story.append(Spacer(1, 4*mm))

    # ── Payment details table ─────────────────────────────────────────────────
    rows = [
        ["Payment Type",   p.get_payment_type_display()],
        ["Payment Method", p.get_payment_method_display()],
    ]
    if due_month:
        rows.append(["For Month", due_month])
    if p.description:
        rows.append(["Note", p.description])

    det_table = Table(rows, colWidths=[45*mm, 75*mm])
    det_table.setStyle(TableStyle([
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",  (0, 0), (0, -1), colors.grey),
        ("FONTNAME",   (1, 0), (1, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(det_table)
    story.append(Spacer(1, 8*mm))

    # ── Signature line ────────────────────────────────────────────────────────
    sig_table = Table(
        [["_" * 25, "_" * 25]],
        colWidths=[60*mm, 60*mm],
    )
    sig_table.setStyle(TableStyle([
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",    (0, 0), (-1, -1), colors.grey),
        ("ALIGN",        (0, 0), (0, -1), "LEFT"),
        ("ALIGN",        (1, 0), (1, -1), "RIGHT"),
    ]))
    story.append(sig_table)

    sig_label = Table(
        [["Resident Signature", "Accountant Signature"]],
        colWidths=[60*mm, 60*mm],
    )
    sig_label.setStyle(TableStyle([
        ("FONTSIZE",  (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.grey),
        ("ALIGN",     (1, 0), (1, -1), "RIGHT"),
    ]))
    story.append(sig_label)
    story.append(Spacer(1, 6*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("Thank you for your timely payment.", footer_style))
    story.append(Paragraph(f"This is a computer-generated receipt. {p.society.name}", footer_style))

    doc.build(story)
    return buf.getvalue()


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class GenerateReceiptsViewSet(ViewSet):
    permission_classes = [IsAccountant]

    # ── list ──────────────────────────────────────────────────────────────────
    def list(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _apply_filters(_base_qs(sid), request.query_params)
        paginator = _Pagination()
        page = paginator.paginate_queryset(qs, request)
        data = ReceiptSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response({"success": True, "count": len(data), "results": data})

    # ── JSON detail ───────────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        sid = _sid(request)
        try:
            payment = _base_qs(sid).get(pk=pk)
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Receipt not found."}, status=404)
        logger.info("RECEIPT_VIEW | id=%s by=%s", pk, request.user)
        return Response({"success": True, "data": ReceiptSerializer(payment).data})

    # ── PDF receipt (single) ──────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """GET /{id}/pdf/ — download a formatted PDF receipt."""
        sid = _sid(request)
        try:
            p = _base_qs(sid).get(pk=pk)
        except ResidentPayment.DoesNotExist:
            return Response({"detail": "Receipt not found."}, status=404)

        pdf_bytes = _build_receipt_pdf(p)
        receipt_number = f"RCPT-{p.pk:06d}"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt_{receipt_number}.pdf"'
        logger.info("RECEIPT_PDF | id=%s by=%s", pk, request.user)
        return response

    # ── Bulk PDF (all receipts in one PDF) ────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="bulk-pdf")
    def bulk_pdf(self, request):
        """
        GET /bulk-pdf/ — all receipts as a single multi-page PDF.
        Same filters as list: ?month, ?flat, ?payment_type, ?search
        """
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _apply_filters(_base_qs(sid), request.query_params)
        payments = list(qs)

        if not payments:
            return Response({"success": False, "message": "No payments found for the given filters."}, status=404)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=15*mm, rightMargin=15*mm,
            topMargin=15*mm, bottomMargin=15*mm,
        )

        styles   = getSampleStyleSheet()
        BLUE     = colors.HexColor("#1D4ED8")
        BORDER   = colors.HexColor("#E5E7EB")
        society_name = payments[0].society.name

        story = []
        for idx, p in enumerate(payments):
            if idx > 0:
                from reportlab.platypus import PageBreak
                story.append(PageBreak())

            receipt_number = f"RCPT-{p.pk:06d}"
            due_month = ""
            if p.maintenance_due_id:
                try:
                    due_month = p.maintenance_due.month.strftime("%B %Y")
                except Exception:
                    pass

            story.append(Paragraph("PAYMENT RECEIPT", ParagraphStyle("t", parent=styles["Heading1"], fontSize=14, textColor=BLUE, spaceAfter=2)))
            story.append(Paragraph(society_name, ParagraphStyle("s", parent=styles["Normal"], fontSize=9, textColor=colors.grey, spaceAfter=10)))
            story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=8))

            meta = Table(
                [[Paragraph(f"<b>Receipt No:</b> {receipt_number}", styles["Normal"]),
                  Paragraph(f"<b>Date:</b> {p.payment_date.strftime('%d %b %Y')}", styles["Normal"])]],
                colWidths=[90*mm, 70*mm],
            )
            meta.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
                ("FONTSIZE",   (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
                ("BOX",        (0, 0), (-1, -1), 0.5, BORDER),
            ]))
            story.append(meta)
            story.append(Spacer(1, 6*mm))
            story.append(Paragraph(p.resident.full_name, ParagraphStyle("n", parent=styles["Normal"], fontSize=12, fontName="Helvetica-Bold")))
            story.append(Paragraph(f"Flat {p.flat.flat_number} • {p.flat.building.name}", ParagraphStyle("f", parent=styles["Normal"], fontSize=9, textColor=colors.grey)))
            story.append(Spacer(1, 4*mm))

            rows = [["Payment Type", p.get_payment_type_display()],
                    ["Payment Method", p.get_payment_method_display()],
                    ["Amount", f"₹ {p.amount:,.2f}"]]
            if due_month:
                rows.append(["For Month", due_month])

            det = Table(rows, colWidths=[50*mm, 110*mm])
            det.setStyle(TableStyle([
                ("FONTSIZE",   (0, 0), (-1, -1), 9),
                ("TEXTCOLOR",  (0, 0), (0, -1), colors.grey),
                ("FONTNAME",   (1, 0), (1, -1), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ]))
            story.append(det)

        doc.build(story)

        from django.utils import timezone as tz
        today = tz.localdate()
        response = HttpResponse(buf.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipts_bulk_{today}.pdf"'
        logger.info("RECEIPT_BULK_PDF | society=%s count=%d by=%s", sid, len(payments), request.user)
        return response

    # ── Bulk CSV ──────────────────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="bulk-csv")
    def bulk_csv(self, request):
        """GET /bulk-csv/ — all receipts as CSV."""
        import csv as _csv

        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = _apply_filters(_base_qs(sid), request.query_params)

        buf = io.StringIO()
        writer = _csv.writer(buf)
        writer.writerow(["Receipt No", "Date", "Society", "Flat", "Building", "Resident", "Mobile", "Type", "Method", "Amount", "For Month", "Description"])
        for p in qs:
            due_month = ""
            if p.maintenance_due_id:
                try:
                    due_month = p.maintenance_due.month.strftime("%b %Y")
                except Exception:
                    pass
            writer.writerow([
                f"RCPT-{p.pk:06d}", p.payment_date, p.society.name,
                p.flat.flat_number, p.flat.building.name,
                p.resident.full_name, p.resident.mobile or "",
                p.get_payment_type_display(), p.get_payment_method_display(),
                p.amount, due_month, p.description,
            ])

        from django.utils import timezone as tz
        response = HttpResponse(buf.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="receipts_bulk_{tz.localdate()}.csv"'
        return response
