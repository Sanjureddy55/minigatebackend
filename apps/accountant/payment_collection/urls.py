"""
Payment Collection URL Configuration
======================================
Base prefix in root urls.py: /api/accountant/payment-collection/

DUES
  GET    /dues/                         List all dues     (?month, ?status, ?building, ?flat)
  POST   /dues/                         Create a single due manually
  GET    /dues/{id}/                    Retrieve one due
  PATCH  /dues/{id}/                    Partial-update    (amount, due_date, description)
  DELETE /dues/{id}/                    Delete unpaid due
  POST   /dues/generate/                Bulk-generate dues for every flat in the society
  POST   /dues/{id}/mark-paid/          Mark paid + auto-create a payment record

PAYMENTS
  GET    /payments/                     List payments     (?month, ?payment_type, ?flat, ?resident)
  POST   /payments/                     Record manual payment
  GET    /payments/{id}/                Retrieve receipt
  PATCH  /payments/{id}/               Partial-update    (description, payment_date, payment_method)
  DELETE /payments/{id}/               Delete payment (resets linked due → pending)

PENDING DUES  (Pending Dues sidebar page)
  GET    /pending-dues/                 KPI summary cards + paginated due list
                                        (?search, ?status, ?building, ?month, ?ordering)
  GET    /pending-dues/summary/         KPI cards only (no list)
  POST   /pending-dues/{id}/mark-paid/ Mark a specific pending/overdue due as paid
  POST   /pending-dues/send-reminders/ Queue reminders for all defaulters
"""

from django.urls import path

from .views import DuesViewSet, PaymentsViewSet, PendingDuesViewSet

# ── Dues ───────────────────────────────────────────────────────────────────────
dues_list      = DuesViewSet.as_view({"get": "list",   "post": "create"})
dues_generate  = DuesViewSet.as_view({"post": "generate"})
dues_detail    = DuesViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
dues_mark_paid = DuesViewSet.as_view({"post": "mark_paid"})

# ── Payments ───────────────────────────────────────────────────────────────────
payments_list   = PaymentsViewSet.as_view({"get": "list",    "post": "create"})
payments_detail = PaymentsViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})

# ── Pending Dues ───────────────────────────────────────────────────────────────
pending_list            = PendingDuesViewSet.as_view({"get": "list"})
pending_summary         = PendingDuesViewSet.as_view({"get": "summary"})
pending_mark_paid       = PendingDuesViewSet.as_view({"post": "mark_paid"})
pending_send_reminders  = PendingDuesViewSet.as_view({"post": "send_reminders"})

urlpatterns = [
    # ── Dues ──────────────────────────────────────────────────────────────────
    path("dues/",                    dues_list,      name="accountant-dues-list"),
    path("dues/generate/",           dues_generate,  name="accountant-dues-generate"),
    path("dues/<int:pk>/",           dues_detail,    name="accountant-dues-detail"),
    path("dues/<int:pk>/mark-paid/", dues_mark_paid, name="accountant-dues-mark-paid"),

    # ── Payments ───────────────────────────────────────────────────────────────
    path("payments/",           payments_list,   name="accountant-payments-list"),
    path("payments/<int:pk>/",  payments_detail, name="accountant-payments-detail"),

    # ── Pending Dues ───────────────────────────────────────────────────────────
    path("pending-dues/",                       pending_list,           name="accountant-pending-dues-list"),
    path("pending-dues/summary/",               pending_summary,        name="accountant-pending-dues-summary"),
    path("pending-dues/<int:pk>/mark-paid/",    pending_mark_paid,      name="accountant-pending-dues-mark-paid"),
    path("pending-dues/send-reminders/",        pending_send_reminders, name="accountant-pending-dues-reminders"),
]
