"""
Payment Reports (Accountant)
==============================
Base prefix: /api/accountant/payment-reports/

  GET  /              Full payment analytics report
                      (?months=12, ?year=YYYY, ?payment_type=, ?payment_method=)
  GET  /download-pdf/ Download analytics report as a formatted PDF

Returns breakdown by method, by type, monthly trend,
approval rates, and average payment amount.
"""

import io
import logging
from datetime import date

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue, ResidentPayment

from .serializers import PaymentReportSerializer

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


class PaymentReportsView(APIView):
    """
    GET /api/accountant/payment-reports/
    ?months=12  rolling window (1-24, default 12)
    ?year=YYYY  filter to a specific year instead of rolling window
    ?payment_type=maintenance|fundraiser|penalty|other
    ?payment_method=cash|upi|bank_transfer|cheque
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        today = timezone.localdate()

        try:
            months = max(1, min(24, int(request.query_params.get("months", 12))))
        except (ValueError, TypeError):
            months = 12

        # Compute period start
        t = today.year * 12 + today.month - 1 - (months - 1)
        period_start = date(t // 12, t % 12 + 1, 1)
        period_label = f"{period_start.strftime('%b %Y')} – {today.strftime('%b %Y')}"

        year_param = request.query_params.get("year", "").strip()
        if year_param:
            try:
                yr = int(year_param)
                period_start = date(yr, 1, 1)
                period_label = str(yr)
            except ValueError:
                pass

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid, payment_date__gte=period_start)
            .select_related("maintenance_due")
        )

        ptype = request.query_params.get("payment_type", "").strip()
        if ptype:
            qs = qs.filter(payment_type=ptype)

        pmethod = request.query_params.get("payment_method", "").strip()
        if pmethod:
            qs = qs.filter(payment_method=pmethod)

        # ── Totals ───────────────────────────────────────────────────────────
        agg = qs.aggregate(total=Sum("amount"), count=Count("id"))
        total_payments = agg["count"] or 0
        total_amount   = float(agg["total"] or 0)
        avg_payment    = round(total_amount / total_payments, 2) if total_payments > 0 else 0.0

        # Approval split (derived from maintenance_due.status, not a DB column)
        approved_q = Q(maintenance_due__isnull=True) | Q(maintenance_due__status=MaintenanceDue.Status.PAID)
        pending_q  = Q(maintenance_due__isnull=False) & Q(maintenance_due__status__in=[
            MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE,
        ])
        approved_count = qs.filter(approved_q).count()
        pending_count  = qs.filter(pending_q).count()

        # ── By method ─────────────────────────────────────────────────────────
        by_method = []
        for val, label in ResidentPayment.PaymentMethod.choices:
            sub = qs.filter(payment_method=val).aggregate(c=Count("id"), t=Sum("amount"))
            cnt = sub["c"] or 0
            tot = float(sub["t"] or 0)
            if cnt == 0:
                continue
            by_method.append({
                "method":         val,
                "method_display": label,
                "count":          cnt,
                "total":          tot,
                "percentage":     round(cnt / total_payments * 100, 1) if total_payments else 0.0,
            })

        # ── By type ───────────────────────────────────────────────────────────
        by_type = []
        for val, label in ResidentPayment.PaymentType.choices:
            sub = qs.filter(payment_type=val).aggregate(c=Count("id"), t=Sum("amount"))
            cnt = sub["c"] or 0
            tot = float(sub["t"] or 0)
            if cnt == 0:
                continue
            by_type.append({
                "type":         val,
                "type_display": label,
                "count":        cnt,
                "total":        tot,
                "percentage":   round(cnt / total_payments * 100, 1) if total_payments else 0.0,
            })

        # ── Monthly trend ─────────────────────────────────────────────────────
        monthly_trend = []
        for i in range(months - 1, -1, -1):
            tv = today.year * 12 + today.month - 1 - i
            y  = tv // 12
            m  = tv % 12 + 1
            sub = qs.filter(payment_date__year=y, payment_date__month=m).aggregate(
                c=Count("id"), t=Sum("amount"),
            )
            cnt = sub["c"] or 0
            month_qs = qs.filter(payment_date__year=y, payment_date__month=m)
            ap  = month_qs.filter(approved_q).count()
            pe  = month_qs.filter(pending_q).count()
            monthly_trend.append({
                "month":    date(y, m, 1).strftime("%b %Y"),
                "count":    cnt,
                "total":    float(sub["t"] or 0),
                "approved": ap,
                "pending":  pe,
            })

        payload = {
            "period":             period_label,
            "total_payments":     total_payments,
            "total_amount":       total_amount,
            "approved_count":     approved_count,
            "pending_count":      pending_count,
            "avg_payment_amount": avg_payment,
            "by_method":          by_method,
            "by_type":            by_type,
            "monthly_trend":      monthly_trend,
        }

        logger.info(
            "PAYMENT_REPORT | society=%s period=%s total=%d amount=%.0f",
            sid, period_label, total_payments, total_amount,
        )
        return Response({"success": True, "data": PaymentReportSerializer(payload).data})


def _build_report_pdf(payload, society_name) -> bytes:
    """Generate a formatted payment analytics PDF using ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    BLUE   = colors.HexColor("#1D4ED8")
    LBLUE  = colors.HexColor("#EFF6FF")
    BORDER = colors.HexColor("#E5E7EB")
    GREY   = colors.HexColor("#6B7280")
    styles = getSampleStyleSheet()

    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=16, textColor=BLUE, spaceAfter=2)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=GREY, spaceAfter=10)
    sh = ParagraphStyle("sh", parent=styles["Heading2"], fontSize=11, textColor=BLUE, spaceBefore=8, spaceAfter=4)
    foot = ParagraphStyle("foot", parent=styles["Normal"], fontSize=8, textColor=GREY, alignment=1)

    def kpi_table(rows):
        t = Table(rows, colWidths=[95*mm, 90*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), LBLUE),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("FONTNAME",      (1, 0), (1, -1), "Helvetica-Bold"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("BOX",           (0, 0), (-1, -1), 0.5, BORDER),
            ("GRID",          (0, 0), (-1, -1), 0.3, BORDER),
            ("TEXTCOLOR",     (0, 0), (0, -1), GREY),
        ]))
        return t

    def breakdown_table(header, rows):
        all_rows = [header] + rows
        col_n = len(header)
        col_w = [185 / col_n * mm] * col_n
        t = Table(all_rows, colWidths=col_w)
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), BLUE),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID",          (0, 0), (-1, -1), 0.3, BORDER),
        ]))
        return t

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=15*mm, bottomMargin=15*mm,
    )

    story = []
    story.append(Paragraph("PAYMENT ANALYTICS REPORT", h1))
    story.append(Paragraph(f"{society_name} — {payload['period']}", sub))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=8))

    # KPIs
    story.append(kpi_table([
        ["Total Payments",        str(payload["total_payments"])],
        ["Total Amount Collected", f"₹ {payload['total_amount']:,.2f}"],
        ["Average Payment",        f"₹ {payload['avg_payment_amount']:,.2f}"],
        ["Approved",               str(payload["approved_count"])],
        ["Pending",                str(payload["pending_count"])],
    ]))
    story.append(Spacer(1, 6*mm))

    # By Method
    if payload.get("by_method"):
        story.append(Paragraph("Breakdown by Payment Method", sh))
        rows = [[r["method_display"], str(r["count"]), f"₹ {r['total']:,.2f}", f"{r['percentage']}%"]
                for r in payload["by_method"]]
        story.append(breakdown_table(["Method", "Count", "Total", "%"], rows))
        story.append(Spacer(1, 5*mm))

    # By Type
    if payload.get("by_type"):
        story.append(Paragraph("Breakdown by Payment Type", sh))
        rows = [[r["type_display"], str(r["count"]), f"₹ {r['total']:,.2f}", f"{r['percentage']}%"]
                for r in payload["by_type"]]
        story.append(breakdown_table(["Type", "Count", "Total", "%"], rows))
        story.append(Spacer(1, 5*mm))

    # Monthly trend
    if payload.get("monthly_trend"):
        story.append(Paragraph("Monthly Trend", sh))
        rows = [[r["month"], str(r["count"]), f"₹ {r['total']:,.2f}", str(r["approved"]), str(r["pending"])]
                for r in payload["monthly_trend"]]
        story.append(breakdown_table(["Month", "Count", "Total", "Approved", "Pending"], rows))

    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"Generated on {timezone.localdate().strftime('%d %b %Y')} · {society_name}", foot))

    doc.build(story)
    return buf.getvalue()


class PaymentReportsPDFView(APIView):
    """
    GET /api/accountant/payment-reports/download-pdf/
    Same filters as the JSON report endpoint. Returns a formatted PDF.
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        # ── Reuse the exact same aggregation logic ────────────────────────────
        report_view = PaymentReportsView()
        report_view.request = request
        json_response = report_view.get(request)
        if json_response.status_code != 200:
            return json_response

        payload = json_response.data["data"]

        from apps.platform_admin.create_society.models import Society
        try:
            society_name = Society.objects.get(pk=sid).name
        except Exception:
            society_name = "Society"

        pdf_bytes = _build_report_pdf(payload, society_name)
        today     = timezone.localdate()
        response  = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="payment_report_{today}.pdf"'
        logger.info("PAYMENT_REPORT_PDF | society=%s by=%s", sid, request.user)
        return response
