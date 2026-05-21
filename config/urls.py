"""Root URL configuration for society_platform."""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Django Debug Toolbar ───────────────────────────────────────────────────
    # Must be registered here so the 'djdt' URL namespace exists.
    # The guard ensures this path is NEVER present in production
    # (DEBUG=False means debug_toolbar is not even in INSTALLED_APPS there).
    *([path("__debug__/", include("debug_toolbar.urls"))] if settings.DEBUG else []),

    # ── Auth / Onboarding / RBAC ──────────────────────────────────────────
    path("api/accounts/",          include("apps.accounts.urls")),
    path("api/roles-permissions/", include("apps.roles_permissions.urls")),

    # ── Super Admin (platform_admin) ───────────────────────────────────────
    path("api/platform-admin/dashboard/",           include("apps.platform_admin.dashboard.urls")),
    path("api/platform-admin/society-management/",  include("apps.platform_admin.society_management.urls")),
    path("api/platform-admin/create-society/",      include("apps.platform_admin.create_society.urls")),
    path("api/platform-admin/society-admins/",      include("apps.platform_admin.society_admins.urls")),
    path("api/platform-admin/subscription-plans/",  include("apps.platform_admin.subscription_plans.urls")),
    path("api/platform-admin/global-users/",        include("apps.platform_admin.global_users.urls")),
    path("api/platform-admin/global-reports/",      include("apps.platform_admin.global_reports.urls")),
    path("api/platform-admin/audit-logs/",          include("apps.platform_admin.audit_logs.urls")),
    path("api/platform-admin/system-settings/",     include("apps.platform_admin.system_settings.urls")),

    # ── Society Admin ──────────────────────────────────────────────────────
    path("api/society-admin/dashboard/",            include("apps.society_admin.dashboard.urls")),
    path("api/society-admin/buildings/",            include("apps.society_admin.buildings.urls")),
    path("api/society-admin/flats/",                include("apps.society_admin.flats.urls")),
    path("api/society-admin/staff-guards/",         include("apps.society_admin.staff_guards.urls")),
    path("api/society-admin/vendors/",              include("apps.society_admin.vendors.urls")),
    path("api/society-admin/notice-board/",         include("apps.society_admin.notice_board.urls")),
    path("api/society-admin/complaints/",           include("apps.society_admin.complaints.urls")),
    path("api/society-admin/payments/",             include("apps.society_admin.payments.urls")),
    path("api/society-admin/fund-dashboard/",       include("apps.society_admin.fund_dashboard.urls")),
    path("api/society-admin/maintenance-expenses/", include("apps.society_admin.maintenance_expenses.urls")),
    path("api/society-admin/monthly-statements/",   include("apps.society_admin.monthly_statements.urls")),
    path("api/society-admin/analytics/",            include("apps.society_admin.analytics.urls")),
    path("api/society-admin/roles-access/",          include("apps.society_admin.roles_access.urls")),
    path("api/society-admin/notifications/",         include("apps.society_admin.notifications.urls")),
    path("api/society-admin/settings/",              include("apps.society_admin.settings.urls")),
    path("api/society-admin/residents/",             include("apps.society_admin.residents.urls")),      # Resident management
    path("api/society-admin/visitors/",              include("apps.society_admin.visitors.urls")),       # Visitor management
    path("api/society-admin/approvals/",             include("apps.society_admin.approvals.urls")),      # Approval workflows
    path("api/society-admin/security/",              include("apps.society_admin.security.urls")),       # Security oversight
    path("api/society-admin/audit-logs/",            include("apps.society_admin.audit_logs.urls")),     # Audit trail & logs

    # ── Resident ──────────────────────────────────────────────────────────
    path("api/resident/dashboard/",  include("apps.resident.dashboard.urls")),
    path("api/resident/complaints/", include("apps.resident.complaints.urls")),
    path("api/resident/payments/",   include("apps.resident.payments.urls")),
    path("api/resident/notices/",    include("apps.resident.notices.urls")),
    path("api/resident/visitors/",   include("apps.resident.visitors.urls")),
    path("api/resident/profile/",    include("apps.resident.profile.urls")),

    # ── Security Guard ────────────────────────────────────────────────────
    path("api/security-guard/dashboard/",        include("apps.security_guard.dashboard.urls")),
    path("api/security-guard/gate-entry/",       include("apps.security_guard.gate_entry.urls")),
    path("api/security-guard/visitor-log/",      include("apps.security_guard.visitor_log.urls")),
    path("api/security-guard/vehicle-tracking/", include("apps.security_guard.vehicle_tracking.urls")),
    path("api/security-guard/emergency-alerts/", include("apps.security_guard.emergency_alerts.urls")),
    path("api/security-guard/shift-management/", include("apps.security_guard.shift_management.urls")),

    # ── Accountant ────────────────────────────────────────────────────────
    path("api/accountant/dashboard/",          include("apps.accountant.dashboard.urls")),
    path("api/accountant/payment-collection/", include("apps.accountant.payment_collection.urls")),
    path("api/accountant/expense-tracking/",   include("apps.accountant.expense_tracking.urls")),
    path("api/accountant/invoices/",           include("apps.accountant.invoices.urls")),
    path("api/accountant/financial-reports/",  include("apps.accountant.financial_reports.urls")),
    path("api/accountant/monthly-statements/", include("apps.accountant.monthly_statements.urls")),

    # ── Maintenance Staff ─────────────────────────────────────────────────
    path("api/maintenance-staff/dashboard/",        include("apps.maintenance_staff.dashboard.urls")),
    path("api/maintenance-staff/assigned-tasks/",   include("apps.maintenance_staff.assigned_tasks.urls")),
    path("api/maintenance-staff/task-updates/",     include("apps.maintenance_staff.task_updates.urls")),
    path("api/maintenance-staff/work-history/",     include("apps.maintenance_staff.work_history.urls")),
    path("api/maintenance-staff/materials-request/",include("apps.maintenance_staff.materials_request.urls")),
    path("api/maintenance-staff/schedule/",         include("apps.maintenance_staff.schedule.urls")),

    # ── Support Staff ─────────────────────────────────────────────────────
    path("api/support-staff/dashboard/",        include("apps.support_staff.dashboard.urls")),
    path("api/support-staff/assigned-tickets/", include("apps.support_staff.assigned_tickets.urls")),
    path("api/support-staff/ticket-updates/",   include("apps.support_staff.ticket_updates.urls")),
    path("api/support-staff/escalations/",      include("apps.support_staff.escalations.urls")),
    path("api/support-staff/service-history/",  include("apps.support_staff.service_history.urls")),

    # ── Delivery Partner ──────────────────────────────────────────────────
    path("api/delivery-partner/dashboard/",        include("apps.delivery_partner.dashboard.urls")),
    path("api/delivery-partner/delivery-requests/",include("apps.delivery_partner.delivery_requests.urls")),
    path("api/delivery-partner/otp-verification/", include("apps.delivery_partner.otp_verification.urls")),
    path("api/delivery-partner/delivery-history/", include("apps.delivery_partner.delivery_history.urls")),
    path("api/delivery-partner/profile/",          include("apps.delivery_partner.profile.urls")),

    # ── Guest User ────────────────────────────────────────────────────────
    path("api/guest/dashboard/",      include("apps.guest_user.dashboard.urls")),
    path("api/guest/visit-request/",  include("apps.guest_user.visit_request.urls")),
    path("api/guest/host-info/",      include("apps.guest_user.host_information.urls")),
    path("api/guest/access-pass/",    include("apps.guest_user.access_pass.urls")),
    path("api/guest/profile/",        include("apps.guest_user.profile.urls")),
]
