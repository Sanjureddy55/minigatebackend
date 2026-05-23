"""
Export Reports (Accountant)
==============================
Base prefix: /api/accountant/export-reports/

  GET  /payments/          Export all payments as CSV
  GET  /payments/pdf/      Export all payments as PDF
  GET  /payments/tally/    Export payments as TallyPrime XML vouchers
  GET  /dues/              Export all dues as CSV
  GET  /dues/pdf/          Export all dues as PDF
  GET  /expenses/          Export maintenance expenses as CSV
  GET  /expenses/pdf/      Export maintenance expenses as PDF
  GET  /statements/        Export monthly statements as CSV
  GET  /statements/pdf/    Export monthly statements as PDF

Common query params: ?month=YYYY-MM, ?year=YYYY, ?status=, ?building=, ?flat=
"""

import csv
import io
import logging
from xml.etree import ElementTree as ET

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAccountant
from apps.resident.payments.models import MaintenanceDue, ResidentPayment
from apps.society_admin.maintenance_expenses.models import MaintenanceExpense
from apps.society_admin.monthly_statements.models import MonthlyStatement

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _csv_response(buf, filename):
    resp = HttpResponse(buf.getvalue(), content_type="text/csv")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


class ExportPaymentsView(APIView):
    """GET /api/accountant/export-reports/payments/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid)
            .select_related("flat__building", "resident", "maintenance_due")
            .order_by("-payment_date", "-created_at")
        )

        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
            except (ValueError, AttributeError):
                pass

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(payment_date__year=int(year))
            except ValueError:
                pass

        building = request.query_params.get("building", "").strip()
        if building:
            qs = qs.filter(flat__building__name__icontains=building)

        flat = request.query_params.get("flat", "").strip()
        if flat:
            qs = qs.filter(flat__flat_number=flat)

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            "Receipt No", "Payment Date", "Flat", "Building",
            "Resident", "Type", "Method", "Amount",
            "For Month", "Status", "Description",
        ])
        for p in qs:
            due_month = ""
            if p.maintenance_due_id:
                try:
                    due_month = p.maintenance_due.month.strftime("%b %Y")
                except Exception:
                    pass
            # derived status
            if p.maintenance_due_id is None or (p.maintenance_due and p.maintenance_due.status == "paid"):
                pstatus = "Approved"
            else:
                pstatus = "Pending"
            w.writerow([
                f"RCPT-{p.pk:06d}", p.payment_date,
                p.flat.flat_number, p.flat.building.name,
                p.resident.full_name,
                p.get_payment_type_display(), p.get_payment_method_display(),
                p.amount, due_month, pstatus, p.description,
            ])

        today = timezone.localdate()
        logger.info("EXPORT_PAYMENTS | society=%s rows=%d by=%s", sid, qs.count(), request.user)
        return _csv_response(buf, f"payments_{today}.csv")


class ExportDuesView(APIView):
    """GET /api/accountant/export-reports/dues/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MaintenanceDue.objects
            .filter(society_id=sid)
            .select_related("flat__building")
            .order_by("-month", "flat__flat_number")
        )

        status_p = request.query_params.get("status", "").strip()
        if status_p:
            qs = qs.filter(status=status_p)

        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(month__year=int(y), month__month=int(m))
            except (ValueError, AttributeError):
                pass

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass

        building = request.query_params.get("building", "").strip()
        if building:
            qs = qs.filter(flat__building__name__icontains=building)

        flat = request.query_params.get("flat", "").strip()
        if flat:
            qs = qs.filter(flat__flat_number=flat)

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            "ID", "Flat", "Building", "Billing Month",
            "Amount", "Status", "Due Date", "Paid At", "Description",
        ])
        for d in qs:
            w.writerow([
                d.pk,
                d.flat.flat_number, d.flat.building.name,
                d.month.strftime("%b %Y") if d.month else "",
                d.amount, d.get_status_display(),
                d.due_date, d.paid_at or "", d.description,
            ])

        today = timezone.localdate()
        logger.info("EXPORT_DUES | society=%s rows=%d by=%s", sid, qs.count(), request.user)
        return _csv_response(buf, f"dues_{today}.csv")


class ExportExpensesView(APIView):
    """GET /api/accountant/export-reports/expenses/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MaintenanceExpense.objects
            .filter(society_id=sid)
            .select_related("created_by")
            .order_by("-expense_date")
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

        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            "ID", "Title", "Category", "Amount",
            "Vendor", "Payment Mode", "Invoice No", "Building / Area",
            "Expense Date", "Status", "Visibility",
            "Proof URL", "Notes", "Recorded By",
        ])
        for e in qs:
            w.writerow([
                e.pk, e.title, e.get_category_display(), e.amount,
                e.vendor_name,
                e.get_payment_mode_display() if hasattr(e, "get_payment_mode_display") else e.payment_mode,
                e.invoice_number, e.building_area,
                e.expense_date,
                "Published" if e.is_published else "Draft",
                "Visible" if e.is_published else "Hidden",
                e.proof_url, e.notes,
                e.created_by.full_name if e.created_by else "",
            ])

        today = timezone.localdate()
        logger.info("EXPORT_EXPENSES | society=%s rows=%d by=%s", sid, qs.count(), request.user)
        return _csv_response(buf, f"expenses_{today}.csv")


class ExportStatementsView(APIView):
    """GET /api/accountant/export-reports/statements/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MonthlyStatement.objects
            .filter(society_id=sid)
            .select_related("society")
            .order_by("-month")
        )

        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass

        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            "ID", "Month", "Society",
            "Total Income", "Total Expenses", "Net Balance",
            "Published", "Notes",
        ])
        for s in qs:
            w.writerow([
                s.pk,
                s.month.strftime("%b %Y") if s.month else "",
                s.society.name,
                getattr(s, "total_income", ""),
                getattr(s, "total_expenses", ""),
                getattr(s, "net_balance", ""),
                "Yes" if s.is_published else "No",
                getattr(s, "notes", ""),
            ])

        today = timezone.localdate()
        logger.info("EXPORT_STATEMENTS | society=%s rows=%d by=%s", sid, qs.count(), request.user)
        return _csv_response(buf, f"statements_{today}.csv")


# ── PDF helpers ───────────────────────────────────────────────────────────────

def _pdf_response(pdf_bytes, filename):
    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def _make_pdf(title, subtitle, headers, rows) -> bytes:
    """Generic ReportLab table-PDF generator."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    BLUE   = colors.HexColor("#1D4ED8")
    BORDER = colors.HexColor("#E5E7EB")
    GREY   = colors.HexColor("#6B7280")
    styles = getSampleStyleSheet()

    use_landscape = len(headers) > 6
    pagesize = landscape(A4) if use_landscape else A4
    lm = rm = 12*mm
    col_count = len(headers)
    page_width = (297 if use_landscape else 210) * mm - lm - rm
    col_w = [page_width / col_count] * col_count

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=pagesize, leftMargin=lm, rightMargin=rm, topMargin=12*mm, bottomMargin=12*mm)

    all_rows = [headers] + [[str(c) for c in row] for row in rows]

    table = Table(all_rows, colWidths=col_w, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID",          (0, 0), (-1, -1), 0.3, BORDER),
    ]))

    story = [
        Paragraph(title, ParagraphStyle("t", parent=styles["Heading1"], fontSize=14, textColor=BLUE, spaceAfter=2)),
        Paragraph(subtitle, ParagraphStyle("s", parent=styles["Normal"], fontSize=9, textColor=GREY, spaceAfter=8)),
        HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=6),
        table,
        Spacer(1, 4*mm),
        Paragraph(
            f"Generated on {timezone.localdate().strftime('%d %b %Y')}",
            ParagraphStyle("f", parent=styles["Normal"], fontSize=8, textColor=GREY, alignment=1),
        ),
    ]
    doc.build(story)
    return buf.getvalue()


class ExportPaymentsPDFView(APIView):
    """GET /api/accountant/export-reports/payments/pdf/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid)
            .select_related("flat__building", "resident", "maintenance_due")
            .order_by("-payment_date", "-created_at")
        )
        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
            except (ValueError, AttributeError):
                pass
        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(payment_date__year=int(year))
            except ValueError:
                pass
        building = request.query_params.get("building", "").strip()
        if building:
            qs = qs.filter(flat__building__name__icontains=building)
        flat = request.query_params.get("flat", "").strip()
        if flat:
            qs = qs.filter(flat__flat_number=flat)

        headers = ["Receipt No", "Date", "Flat", "Building", "Resident", "Type", "Method", "Amount", "Status"]
        rows = []
        for p in qs:
            if p.maintenance_due_id is None or (p.maintenance_due and p.maintenance_due.status == "paid"):
                pstatus = "Approved"
            else:
                pstatus = "Pending"
            rows.append([
                f"RCPT-{p.pk:06d}", p.payment_date.strftime("%d %b %Y"),
                p.flat.flat_number, p.flat.building.name,
                p.resident.full_name,
                p.get_payment_type_display(), p.get_payment_method_display(),
                f"₹ {p.amount:,.2f}", pstatus,
            ])

        today = timezone.localdate()
        pdf = _make_pdf("Payments Export", f"Total records: {len(rows)}", headers, rows)
        logger.info("EXPORT_PAYMENTS_PDF | society=%s rows=%d by=%s", sid, len(rows), request.user)
        return _pdf_response(pdf, f"payments_{today}.pdf")


class ExportDuesPDFView(APIView):
    """GET /api/accountant/export-reports/dues/pdf/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MaintenanceDue.objects
            .filter(society_id=sid)
            .select_related("flat__building")
            .order_by("-month", "flat__flat_number")
        )
        status_p = request.query_params.get("status", "").strip()
        if status_p:
            qs = qs.filter(status=status_p)
        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(month__year=int(y), month__month=int(m))
            except (ValueError, AttributeError):
                pass
        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass
        building = request.query_params.get("building", "").strip()
        if building:
            qs = qs.filter(flat__building__name__icontains=building)
        flat = request.query_params.get("flat", "").strip()
        if flat:
            qs = qs.filter(flat__flat_number=flat)

        headers = ["Flat", "Building", "Billing Month", "Amount", "Status", "Due Date"]
        rows = []
        for d in qs:
            rows.append([
                d.flat.flat_number, d.flat.building.name,
                d.month.strftime("%b %Y") if d.month else "",
                f"₹ {d.amount:,.2f}", d.get_status_display(),
                d.due_date.strftime("%d %b %Y") if d.due_date else "",
            ])

        today = timezone.localdate()
        pdf = _make_pdf("Dues Export", f"Total records: {len(rows)}", headers, rows)
        logger.info("EXPORT_DUES_PDF | society=%s rows=%d by=%s", sid, len(rows), request.user)
        return _pdf_response(pdf, f"dues_{today}.pdf")


class ExportExpensesPDFView(APIView):
    """GET /api/accountant/export-reports/expenses/pdf/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MaintenanceExpense.objects
            .filter(society_id=sid)
            .select_related("created_by")
            .order_by("-expense_date")
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
        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        headers = ["Title", "Category", "Amount", "Vendor", "Payment Mode", "Date", "Status"]
        rows = []
        for e in qs:
            rows.append([
                e.title, e.get_category_display(), f"₹ {e.amount:,.2f}",
                e.vendor_name,
                e.get_payment_mode_display() if hasattr(e, "get_payment_mode_display") else e.payment_mode,
                e.expense_date.strftime("%d %b %Y") if e.expense_date else "",
                "Published" if e.is_published else "Draft",
            ])

        today = timezone.localdate()
        pdf = _make_pdf("Maintenance Expenses Export", f"Total records: {len(rows)}", headers, rows)
        logger.info("EXPORT_EXPENSES_PDF | society=%s rows=%d by=%s", sid, len(rows), request.user)
        return _pdf_response(pdf, f"expenses_{today}.pdf")


class ExportStatementsPDFView(APIView):
    """GET /api/accountant/export-reports/statements/pdf/"""
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            MonthlyStatement.objects
            .filter(society_id=sid)
            .select_related("society")
            .order_by("-month")
        )
        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(month__year=int(year))
            except ValueError:
                pass
        pub = request.query_params.get("is_published", "").strip()
        if pub:
            qs = qs.filter(is_published=pub.lower() == "true")

        headers = ["Month", "Society", "Total Income", "Total Expenses", "Net Balance", "Published"]
        rows = []
        for s in qs:
            rows.append([
                s.month.strftime("%b %Y") if s.month else "",
                s.society.name,
                f"₹ {getattr(s, 'total_income', 0) or 0:,.2f}",
                f"₹ {getattr(s, 'total_expenses', 0) or 0:,.2f}",
                f"₹ {getattr(s, 'net_balance', 0) or 0:,.2f}",
                "Yes" if s.is_published else "No",
            ])

        today = timezone.localdate()
        pdf = _make_pdf("Monthly Statements Export", f"Total records: {len(rows)}", headers, rows)
        logger.info("EXPORT_STATEMENTS_PDF | society=%s rows=%d by=%s", sid, len(rows), request.user)
        return _pdf_response(pdf, f"statements_{today}.pdf")


# ── Tally XML export ──────────────────────────────────────────────────────────

class ExportPaymentsTallyView(APIView):
    """
    GET /api/accountant/export-reports/payments/tally/
    Exports ResidentPayment records as TallyPrime-compatible XML vouchers.
    Supports same filters as CSV export: ?month, ?year, ?building, ?flat
    """
    permission_classes = [IsAccountant]

    def get(self, request):
        sid = _sid(request)
        if not sid:
            return Response({"success": False, "message": "No society linked."}, status=400)

        qs = (
            ResidentPayment.objects
            .filter(society_id=sid)
            .select_related("flat__building", "resident", "society")
            .order_by("-payment_date", "-created_at")
        )
        month = request.query_params.get("month", "").strip()
        if month:
            try:
                y, m = month.split("-")
                qs = qs.filter(payment_date__year=int(y), payment_date__month=int(m))
            except (ValueError, AttributeError):
                pass
        year = request.query_params.get("year", "").strip()
        if year:
            try:
                qs = qs.filter(payment_date__year=int(year))
            except ValueError:
                pass
        building = request.query_params.get("building", "").strip()
        if building:
            qs = qs.filter(flat__building__name__icontains=building)
        flat = request.query_params.get("flat", "").strip()
        if flat:
            qs = qs.filter(flat__flat_number=flat)

        payments = list(qs)

        # Build TallyPrime XML
        envelope = ET.Element("ENVELOPE")
        header = ET.SubElement(envelope, "HEADER")
        ET.SubElement(header, "TALLYREQUEST").text = "Import Data"

        body = ET.SubElement(envelope, "BODY")
        importdata = ET.SubElement(body, "IMPORTDATA")
        requestdesc = ET.SubElement(importdata, "REQUESTDESC")
        ET.SubElement(requestdesc, "REPORTNAME").text = "Vouchers"
        ET.SubElement(requestdesc, "STATICVARIABLES")

        requestdata = ET.SubElement(importdata, "REQUESTDATA")

        for p in payments:
            date_str = p.payment_date.strftime("%Y%m%d")
            receipt_no = f"RCPT-{p.pk:06d}"
            ledger_name = p.resident.full_name
            amount = str(p.amount)
            narration = (
                f"Flat {p.flat.flat_number}, {p.flat.building.name}. "
                f"Type: {p.get_payment_type_display()}. "
                f"Method: {p.get_payment_method_display()}."
            )

            tallymsg = ET.SubElement(requestdata, "TALLYMESSAGE", attrib={"xmlns:UDF": "TallyUDF"})
            voucher = ET.SubElement(tallymsg, "VOUCHER", attrib={
                "REMOTEID": receipt_no,
                "VCHTYPE": "Receipt",
                "ACTION": "Create",
            })
            ET.SubElement(voucher, "DATE").text = date_str
            ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Receipt"
            ET.SubElement(voucher, "VOUCHERNUMBER").text = receipt_no
            ET.SubElement(voucher, "NARRATION").text = narration

            # Debit: Bank/Cash ledger
            method_map = {
                "cash": "Cash",
                "upi": "UPI",
                "bank_transfer": "Bank Transfer",
                "cheque": "Cheque",
            }
            bank_ledger = method_map.get(p.payment_method, "Bank Transfer")

            allledger_dr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(allledger_dr, "LEDGERNAME").text = bank_ledger
            ET.SubElement(allledger_dr, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(allledger_dr, "AMOUNT").text = f"-{amount}"

            # Credit: Resident ledger
            allledger_cr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(allledger_cr, "LEDGERNAME").text = ledger_name
            ET.SubElement(allledger_cr, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(allledger_cr, "AMOUNT").text = amount

        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(envelope, encoding="unicode")

        today = timezone.localdate()
        response = HttpResponse(xml_str, content_type="application/xml")
        response["Content-Disposition"] = f'attachment; filename="payments_tally_{today}.xml"'
        logger.info("EXPORT_PAYMENTS_TALLY | society=%s count=%d by=%s", sid, len(payments), request.user)
        return response
