"""
MiniGate API Report Generator
Run: python generate_api_report.py
Output: MiniGate_API_Report.xlsx
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime

# ── Colour palette ────────────────────────────────────────────────────────────
CLR = {
    "GET":     "E8F5E9",  # green
    "POST":    "E3F2FD",  # blue
    "PUT":     "FFF8E1",  # amber
    "PATCH":   "F3E5F5",  # purple
    "DELETE":  "FFEBEE",  # red
    "HEADER":  "1565C0",  # section header bg (dark blue)
    "COL_HDR": "2E7D32",  # column header bg (dark green)
    "FONT_W":  "FFFFFF",
}

METHOD_FONT = {
    "GET":    "1B5E20",
    "POST":   "0D47A1",
    "PUT":    "F57F17",
    "PATCH":  "4A148C",
    "DELETE": "B71C1C",
}

THIN = Side(style="thin", color="CCCCCC")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

# ── API definitions ───────────────────────────────────────────────────────────
# Each entry: (method, url, description, request_body, response_example)
SECTIONS = [
    # ── 1. Auth / OTP ──────────────────────────────────────────────────────
    ("AUTH / OTP & LOGIN", [
        ("POST", "/api/accounts/otp/send/",
         "Send OTP to mobile (dev: always 123456)",
         '{"mobile": "+919876543210"}',
         '{"success": true, "message": "OTP sent", "dev_otp": "123456"}'),

        ("POST", "/api/accounts/otp/verify/",
         "Verify OTP (hardcoded 123456 in dev)",
         '{"mobile": "+919876543210", "otp_code": "123456"}',
         '{"success": true, "message": "OTP verified. Proceed to onboarding."}'),

        ("POST", "/api/accounts/login/email/",
         "Email + password login — returns full profile",
         '{"email": "admin@minigate.com", "password": "123456"}',
         '{"success": true, "data": {"user_id": 1, "email": "...", "profile": {...}}}'),

        ("POST", "/api/accounts/login/mobile/",
         "Mobile OTP login (OTP always 123456)",
         '{"mobile": "+919876543210", "otp_code": "123456"}',
         '{"success": true, "data": {...profile...}}'),
    ]),

    # ── 2. Onboarding ───────────────────────────────────────────────────────
    ("ONBOARDING", [
        ("GET", "/api/accounts/onboarding/countries/",
         "List all active countries",
         "",
         '{"success": true, "count": 5, "results": [{"id":1,"name":"India",...}]}'),

        ("GET", "/api/accounts/onboarding/cities/?country=1",
         "List cities filtered by country",
         "",
         '{"success": true, "count": 20, "results": [...]}'),

        ("GET", "/api/accounts/onboarding/societies/?city=Pune",
         "List active societies in a city",
         "",
         '{"success": true, "count": 3, "results": [...]}'),

        ("POST", "/api/accounts/onboarding/complete/",
         "Complete onboarding — create user profile",
         '{"mobile":"+91...","full_name":"Raj","country_id":1,"city_id":2,"society_id":5,"flat_number":"101"}',
         '{"success": true, "message": "Onboarding complete.", "data": {...profile...}}'),
    ]),

    # ── 3. Roles & Permissions (Super Admin) ──────────────────────────────
    ("ROLES & PERMISSIONS (SUPER ADMIN)", [
        ("POST",   "/api/roles-permissions/setup-super-admin/",      "One-shot Super Admin creation",             '{"full_name":"Srujan","email":"admin@minigate.com","mobile":"+919876543210"}', '{"success":true,"data":{"role":{...},"user":{...}}}'),
        ("GET",    "/api/roles-permissions/roles/",                   "List ALL roles (all types)",                "?role_type=admin&is_active=true&search=guard", '{"success":true,"count":9,"results":[...]}'),
        ("POST",   "/api/roles-permissions/roles/",                   "Create role (unrestricted)",                '{"name":"Custom Role","role_type":"operational","module_permissions":[...]}', '{"success":true,"data":{...}}'),
        ("GET",    "/api/roles-permissions/roles/{id}/",              "Get role detail with module perms",         "", '{"success":true,"data":{"id":1,"name":"Super Admin","module_permissions":[...]}}'),
        ("PATCH",  "/api/roles-permissions/roles/{id}/",              "Update role / module permissions",          '{"module_permissions":[{"module":"visitors","can_view":true,...}]}', '{"success":true,"data":{...}}'),
        ("DELETE", "/api/roles-permissions/roles/{id}/",              "Delete role (blocked for system roles)",    "", '{"success":true,"message":"Role deleted."}'),
        ("POST",   "/api/roles-permissions/roles/{id}/assign-user/",  "Create user under this role + send email",  '{"full_name":"John","email":"john@co.com","mobile":"+919..."}', '{"success":true,"data":{"id":5,"password":"123456",...}}'),
        ("GET",    "/api/roles-permissions/users/",                   "List all user profiles",                    "?status=active&role=2", '{"success":true,"count":20,"results":[...]}'),
        ("GET",    "/api/roles-permissions/users/{id}/",              "Get user profile detail",                   "", '{"success":true,"data":{...}}'),
        ("PATCH",  "/api/roles-permissions/users/{id}/",              "Update user profile",                       '{"status":"inactive","description":"..."}', '{"success":true,"data":{...}}'),
        ("DELETE", "/api/roles-permissions/users/{id}/",              "Soft-deactivate user (status=inactive)",    "", '{"success":true,"message":"User deactivated."}'),
    ]),

    # ── 4. Society Admin — Roles & Access (Restricted) ────────────────────
    ("SOCIETY ADMIN — ROLES & ACCESS", [
        ("GET",    "/api/society-admin/roles-access/",                       "List assignable roles (excludes Super Admin + Society Admin)",  "?role_type=operational&is_active=true&search=guard", '{"count":7,"results":[{"id":2,"name":"Security Guard","user_count":3,...}]}'),
        ("POST",   "/api/society-admin/roles-access/",                       "Create custom role (operational/resident/external only)",      '{"name":"Night Guard","role_type":"operational","description":"Night shift only","module_permissions":[{"module":"gate_entry","can_view":true,"can_create":true,"can_edit":false,"can_delete":false}]}', '{"success":true,"data":{"id":10,"name":"Night Guard","slug":"night-guard","module_permissions":[...]}}'),
        ("GET",    "/api/society-admin/roles-access/{id}/",                  "Get role detail + all module permissions",                      "", '{"success":true,"data":{"id":10,"name":"Night Guard","user_count":0,"module_permissions":[...]}}'),
        ("PATCH",  "/api/society-admin/roles-access/{id}/",                  "Update role name / description / permissions",                  '{"module_permissions":[{"module":"visitors","can_view":true,...}]}', '{"success":true,"data":{...}}'),
        ("DELETE", "/api/society-admin/roles-access/{id}/",                  "Delete role (blocked if active users assigned or system role)", "", '{"success":true,"message":"Role deleted."} OR {"success":false,"message":"Cannot delete: X active user(s)"}'),
        ("POST",   "/api/society-admin/roles-access/{id}/assign-user/",      "Create user under this role scoped to society",                 '{"full_name":"Ramesh","email":"ramesh@guard.com","mobile":"+919111000001","society":9}', '{"success":true,"data":{"id":22,"password":"123456","role":10,...}}'),
        ("POST",   "/api/society-admin/roles-access/{id}/toggle-active/",    "Enable / disable a role",                                       '{}', '{"success":true,"message":"Role deactivated.","data":{"is_active":false,...}}'),
        ("GET",    "/api/society-admin/roles-access/available-modules/",     "All 17 modules + allowed role types for dropdowns",             "", '{"modules":[{"value":"gate_entry","label":"Gate Entry"}...],"role_types":[{"value":"operational",...}]}'),
        ("GET",    "/api/society-admin/roles-access/dashboard/",             "Role & user KPIs for the society",                              "?society=9", '{"total_roles":9,"active_roles":9,"total_users":3,"active_users":3,"by_role_type":[...],"by_role":[...]}'),
        ("GET",    "/api/society-admin/roles-access/users/",                 "List users (excludes Super Admin / Society Admin users)",        "?society=9&status=active&role=10", '{"count":3,"results":[{"id":22,"full_name":"Ramesh","role_name":"Night Guard",...}]}'),
        ("GET",    "/api/society-admin/roles-access/users/{id}/",            "Get user profile detail",                                       "", '{"success":true,"data":{...}}'),
        ("PATCH",  "/api/society-admin/roles-access/users/{id}/",            "Update user profile",                                           '{"description":"Updated note"}', '{"success":true,"data":{...}}'),
        ("DELETE", "/api/society-admin/roles-access/users/{id}/",            "Soft-deactivate user (status=inactive)",                        "", '{"success":true,"message":"User deactivated."}'),
    ]),

    # ── 4. Platform Admin — Dashboard ──────────────────────────────────────
    ("PLATFORM ADMIN — DASHBOARD", [
        ("GET", "/api/platform-admin/dashboard/stats/",
         "Live platform KPIs (societies, users, tickets, MRR)",
         "?city_id=1&plan=pro&date_from=2026-01-01",
         '{"total_societies":50,"active_societies":42,"total_users":1200,"mrr":250000,...}'),

        ("GET", "/api/platform-admin/dashboard/societies/",
         "Paginated society list with search/filter",
         "?search=blue&status=active&plan=pro&city=Mumbai&ordering=-created_at&page=1",
         '{"count":10,"results":[{"id":1,"name":"Blue Ridge","city":"Mumbai",...}]}'),
    ]),

    # ── 5. Platform Admin — Society Management ─────────────────────────────
    ("PLATFORM ADMIN — SOCIETY MANAGEMENT", [
        ("GET",    "/api/platform-admin/society-management/",       "List all societies",      "?search=&status=active&plan=pro", '{"count":50,"results":[...]}'),
        ("POST",   "/api/platform-admin/society-management/",       "Create society",          '{"name":"Green Valley","city":1,"admin_email":"...","plan":"pro"}', '{"id":51,...}'),
        ("GET",    "/api/platform-admin/society-management/{id}/",  "Get society detail",      "", '{"id":1,"name":"...",...}'),
        ("PATCH",  "/api/platform-admin/society-management/{id}/",  "Update society",          '{"status":"inactive"}', '{"id":1,...}'),
        ("DELETE", "/api/platform-admin/society-management/{id}/",  "Delete society",          "", "HTTP 204"),
    ]),

    # ── 6. Platform Admin — Create Society ─────────────────────────────────
    ("PLATFORM ADMIN — CREATE SOCIETY", [
        ("GET",    "/api/platform-admin/create-society/",       "List created societies",  "", '{"count":50,"results":[...]}'),
        ("POST",   "/api/platform-admin/create-society/",       "Create new society",      '{"name":"Pearl Residency","city":3,"admin_email":"...","plan":"enterprise","total_flats":200}', '{"id":52,...}'),
        ("GET",    "/api/platform-admin/create-society/{id}/",  "Get society",             "", '{"id":52,...}'),
        ("PATCH",  "/api/platform-admin/create-society/{id}/",  "Update society",          '{"plan":"pro"}', '{"id":52,...}'),
        ("DELETE", "/api/platform-admin/create-society/{id}/",  "Delete society",          "", "HTTP 204"),
    ]),

    # ── 7. Platform Admin — Society Admins ────────────────────────────────
    ("PLATFORM ADMIN — SOCIETY ADMINS", [
        ("GET",    "/api/platform-admin/society-admins/",       "List society admin profiles",  "?society=1&status=active", '{"count":10,...}'),
        ("POST",   "/api/platform-admin/society-admins/",       "Assign society admin",         '{"user":5,"society":2}', '{"id":11,...}'),
        ("GET",    "/api/platform-admin/society-admins/{id}/",  "Get admin detail",             "", '{"id":11,...}'),
        ("PATCH",  "/api/platform-admin/society-admins/{id}/",  "Update admin",                 '{"status":"inactive"}', '{"id":11,...}'),
        ("DELETE", "/api/platform-admin/society-admins/{id}/",  "Remove admin",                 "", "HTTP 204"),
    ]),

    # ── 8. Platform Admin — Subscription Plans ────────────────────────────
    ("PLATFORM ADMIN — SUBSCRIPTION PLANS", [
        ("GET",    "/api/platform-admin/subscription-plans/",       "List plans",    "", '{"count":3,"results":[{"id":1,"name":"Pro",...}]}'),
        ("POST",   "/api/platform-admin/subscription-plans/",       "Create plan",   '{"name":"Enterprise Plus","price":9999}', '{"id":4,...}'),
        ("GET",    "/api/platform-admin/subscription-plans/{id}/",  "Get plan",      "", '{"id":1,...}'),
        ("PATCH",  "/api/platform-admin/subscription-plans/{id}/",  "Update plan",   '{"price":4999}', '{"id":1,...}'),
        ("DELETE", "/api/platform-admin/subscription-plans/{id}/",  "Delete plan",   "", "HTTP 204"),
    ]),

    # ── 9. Platform Admin — Global Users ──────────────────────────────────
    ("PLATFORM ADMIN — GLOBAL USERS", [
        ("GET",    "/api/platform-admin/global-users/",         "Stats bar + paginated user table",  "?search=john&status=active&role_type=admin&society=1&ordering=-created_at", '{"stats":{"total_users":1200,"active":1100,"suspended":100},"results":[...]}'),
        ("POST",   "/api/platform-admin/global-users/invite/",  "Invite (create) user",              '{"email":"new@user.com","full_name":"New User","role":2,"society":5}', '{"id":201,...}'),
        ("GET",    "/api/platform-admin/global-users/export/",  "Export users as CSV",               "?status=active", "CSV file download"),
        ("GET",    "/api/platform-admin/global-users/{id}/",    "Get user detail",                   "", '{"id":201,...}'),
        ("PATCH",  "/api/platform-admin/global-users/{id}/",    "Update user",                       '{"status":"suspended"}', '{"id":201,...}'),
        ("DELETE", "/api/platform-admin/global-users/{id}/",    "Delete user",                       "", "HTTP 204"),
    ]),

    # ── 10. Platform Admin — Global Reports ───────────────────────────────
    ("PLATFORM ADMIN — GLOBAL REPORTS", [
        ("GET", "/api/platform-admin/global-reports/",
         "Aggregated KPIs + breakdowns (plan, status, city, tickets, revenue)",
         "?city_id=1&plan=pro&status=active&date_from=2026-01-01&date_to=2026-12-31",
         '{"kpis":{...},"by_plan":[...],"by_status":[...],"by_city":[...],"tickets_by_category":[...]}'),
    ]),

    # ── 11. Platform Admin — Audit Logs ───────────────────────────────────
    ("PLATFORM ADMIN — AUDIT LOGS", [
        ("GET", "/api/platform-admin/audit-logs/",
         "Paginated audit log (read-only)",
         "?category=login&action=create&actor=1&target_type=Society&date_from=2026-01-01",
         '{"count":500,"results":[{"id":1,"action":"create","category":"create",...}]}'),
        ("GET", "/api/platform-admin/audit-logs/{id}/",
         "Get audit log detail",
         "", '{"id":1,"actor_name":"Srujan","action":"create_society",...}'),
    ]),

    # ── 12. Society Admin — Buildings ─────────────────────────────────────
    ("SOCIETY ADMIN — BUILDINGS", [
        ("GET",    "/api/society-admin/buildings/",       "List buildings (filterable by society)",  "?society=9&search=tower&ordering=name", '{"count":5,"results":[{"id":"uuid","name":"Tower A","society_name":"Lotus Tower","flat_count":48}]}'),
        ("POST",   "/api/society-admin/buildings/",       "Create building",                         '{"name":"Tower B","society":9}', '{"id":"uuid","name":"Tower B","society_name":"Lotus Tower","flat_count":0}'),
        ("GET",    "/api/society-admin/buildings/{id}/",  "Get building detail",                     "", '{"id":"uuid","name":"Tower B","flat_count":48,...}'),
        ("PATCH",  "/api/society-admin/buildings/{id}/",  "Update building",                         '{"name":"Tower B Renamed"}', '{"id":"uuid","name":"Tower B Renamed",...}'),
        ("DELETE", "/api/society-admin/buildings/{id}/",  "Delete building",                         "", "HTTP 204"),
    ]),

    # ── 13. Society Admin — Flats ──────────────────────────────────────────
    ("SOCIETY ADMIN — FLATS", [
        ("GET",    "/api/society-admin/flats/",       "List flats (filter by building/society)",  "?building=uuid&building__society=9&search=101", '{"count":240,"results":[{"id":"uuid","flat_number":"101","building_name":"Tower A",...}]}'),
        ("POST",   "/api/society-admin/flats/",       "Create flat",                             '{"flat_number":"501","building":"<uuid>"}', '{"id":"uuid","flat_number":"501","building_name":"Tower B",...}'),
        ("GET",    "/api/society-admin/flats/{id}/",  "Get flat detail",                         "", '{"id":"uuid","flat_number":"101","building_name":"Tower A","society_name":"Lotus Tower",...}'),
        ("PATCH",  "/api/society-admin/flats/{id}/",  "Update flat",                             '{"flat_number":"502"}', '{"id":"uuid","flat_number":"502",...}'),
        ("DELETE", "/api/society-admin/flats/{id}/",  "Delete flat",                             "", "HTTP 204"),
    ]),

    # ── 14. Society Admin — Visitors ──────────────────────────────────────
    ("SOCIETY ADMIN — VISITORS", [
        ("GET",    "/api/society-admin/visitors/",              "List visitors (filter by status/type/society/flat)",  "?society=9&status=pending&visit_type=guest&search=john", '{"count":10,"results":[{"id":1,"full_name":"John Doe","status_display":"Pending Approval",...}]}'),
        ("POST",   "/api/society-admin/visitors/",              "Register new visitor",                                '{"full_name":"John Doe","mobile":"+919000000001","visit_type":"guest","purpose":"Meeting","host_name":"Mr. Smith","society":9,"flat":"<uuid>"}', '{"id":3,"full_name":"John Doe","status":"pending","status_display":"Pending Approval",...}'),
        ("GET",    "/api/society-admin/visitors/{id}/",         "Get visitor detail",                                  "", '{"id":1,"full_name":"John Doe","status_display":"Inside","checked_in_at":"2026-05-22T10:00:00Z",...}'),
        ("PATCH",  "/api/society-admin/visitors/{id}/",         "Update visitor info",                                 '{"vehicle_number":"MH12AB1234"}', '{"id":1,...}'),
        ("DELETE", "/api/society-admin/visitors/{id}/",         "Delete visitor record",                               "", "HTTP 204"),
        ("POST",   "/api/society-admin/visitors/{id}/approve/", "Approve visitor entry",                               '{"notes":"Approved"}', '{"id":1,"status":"approved","status_display":"Approved",...}'),
        ("POST",   "/api/society-admin/visitors/{id}/reject/",  "Reject visitor entry",                                '{"reason":"Unauthorized"}', '{"id":1,"status":"rejected","rejected_reason":"Unauthorized",...}'),
        ("POST",   "/api/society-admin/visitors/{id}/check-in/","Check visitor in (mark inside)",                      '{}', '{"id":1,"status":"inside","checked_in_at":"2026-05-22T10:05:00Z",...}'),
        ("POST",   "/api/society-admin/visitors/{id}/check-out/","Check visitor out (mark exited)",                    '{}', '{"id":1,"status":"exited","checked_out_at":"2026-05-22T11:30:00Z",...}'),
        ("GET",    "/api/society-admin/visitors/dashboard/",    "Visitor dashboard KPIs",                              "?society=9", '{"total_today":15,"currently_inside":3,"pending_approval":2,"rejected_today":1,"by_visit_type":[...]}'),
    ]),

    # ── 15. Society Admin — Approvals ─────────────────────────────────────
    ("SOCIETY ADMIN — APPROVALS", [
        ("GET",    "/api/society-admin/approvals/",               "List approval requests (filter by status/stage/priority)",  "?society=9&status=pending&priority=high&stage=submitted", '{"count":5,"results":[{"id":1,"title":"Gate Repair","status_display":"Pending",...}]}'),
        ("POST",   "/api/society-admin/approvals/",               "Create approval request",                                   '{"title":"Gate Repair","description":"Motor broken","category":"maintenance","priority":"high","society":9}', '{"id":1,"title":"Gate Repair","stage_display":"Submitted","status_display":"Pending",...}'),
        ("GET",    "/api/society-admin/approvals/{id}/",          "Get approval request detail",                               "", '{"id":1,"title":"Gate Repair","stage":"submitted","priority_display":"High",...}'),
        ("PATCH",  "/api/society-admin/approvals/{id}/",          "Update approval request",                                   '{"description":"Updated description"}', '{"id":1,...}'),
        ("DELETE", "/api/society-admin/approvals/{id}/",          "Delete approval request",                                   "", "HTTP 204"),
        ("POST",   "/api/society-admin/approvals/{id}/approve/",  "Approve request",                                           '{"reviewer_notes":"Approved","progress":100}', '{"id":1,"status":"approved","stage":"approved","progress":100,...}'),
        ("POST",   "/api/society-admin/approvals/{id}/reject/",   "Reject request",                                            '{"reason":"Insufficient budget"}', '{"id":1,"status":"rejected","reviewer_notes":"Insufficient budget",...}'),
        ("PATCH",  "/api/society-admin/approvals/{id}/progress/", "Update progress percentage",                                '{"progress":75}', '{"id":1,"progress":75,...}'),
    ]),

    # ── 16. Society Admin — Notice Board ──────────────────────────────────
    ("SOCIETY ADMIN — NOTICE BOARD", [
        ("GET",    "/api/society-admin/notice-board/",                    "List notices (filter by category/audience/status/tower)", "?society=9&category=fundraiser&status=active&audience=all&search=AGM", '{"count":4,"results":[{"id":1,"title":"AGM Meeting","category_display":"Notice","status_display":"Active",...}]}'),
        ("POST",   "/api/society-admin/notice-board/",                    "Create notice / event / fundraiser / maintenance alert",  '{"title":"Diwali Party","category":"event","audience":"all","event_date":"2026-10-20","society":9}', '{"id":5,"title":"Diwali Party","category_display":"Event","is_fundraiser":false,...}'),
        ("GET",    "/api/society-admin/notice-board/{id}/",               "Get notice detail with read count",                       "", '{"id":1,"title":"AGM Meeting","read_count":5,"is_fundraiser":false,...}'),
        ("PATCH",  "/api/society-admin/notice-board/{id}/",               "Update notice",                                           '{"description":"Updated description","status":"inactive"}', '{"id":1,...}'),
        ("DELETE", "/api/society-admin/notice-board/{id}/",               "Delete notice",                                           "", "HTTP 204"),
        ("POST",   "/api/society-admin/notice-board/{id}/mark-read/",     "Mark notice as read by a resident",                       '{"resident":1}', '{"id":1,"notice_title":"AGM Meeting","resident_name":"Raj Kumar","read_at":"2026-05-22T10:00:00Z"}'),
        ("GET",    "/api/society-admin/notice-board/{id}/read-receipts/", "List residents who have read this notice",                "", '{"count":5,"results":[{"resident_name":"Raj Kumar","read_at":"..."},...]}'),
        ("POST",   "/api/society-admin/notice-board/{id}/archive/",       "Archive a notice (soft delete)",                          '{}', '{"id":1,"status":"archived","status_display":"Archived",...}'),
        ("POST",   "/api/society-admin/notice-board/{id}/activate/",      "Re-activate an archived/inactive notice",                 '{}', '{"id":1,"status":"active","status_display":"Active",...}'),
        ("GET",    "/api/society-admin/notice-board/dashboard/",          "Notice board KPI dashboard",                              "?society=9", '{"active_notices":4,"live_fundraisers":1,"upcoming_events":1,"maintenance_alerts":1,"total_unread":3,"by_category":[...],"by_audience":[...]}'),
    ]),

    # ── 17. Society Admin — Notifications ─────────────────────────────────
    ("SOCIETY ADMIN — NOTIFICATIONS", [
        ("GET",    "/api/society-admin/notifications/",                    "List notifications (inbox) for a recipient",           "?recipient=1&is_read=false&notif_type=payment&search=due", '{"count":3,"results":[{"id":1,"title":"...","is_read":false,...}]}'),
        ("POST",   "/api/society-admin/notifications/",                    "Create in-app notification for a resident",            '{"title":"Payment Due","body":"Rs 3500 due by 31 May","notif_type":"payment","recipient":1,"society":9}', '{"id":4,"title":"Payment Due","is_read":false,...}'),
        ("GET",    "/api/society-admin/notifications/{id}/",               "Get notification detail",                              "", '{"id":1,"title":"...","notif_type_display":"Notice","notice_title":"AGM Meeting",...}'),
        ("PATCH",  "/api/society-admin/notifications/{id}/",               "Update notification",                                  '{"title":"URGENT: Payment Due"}', '{"id":1,...}'),
        ("DELETE", "/api/society-admin/notifications/{id}/",               "Delete notification",                                  "", "HTTP 204"),
        ("POST",   "/api/society-admin/notifications/{id}/mark-read/",     "Mark single notification as read",                     '{}', '{"id":1,"is_read":true,"read_at":"2026-05-22T10:00:00Z",...}'),
        ("POST",   "/api/society-admin/notifications/mark-all-read/",      "Mark all unread notifications as read for a recipient","'{'recipient':1}'", '{"marked_read":5}'),
        ("GET",    "/api/society-admin/notifications/stats/",              "Notification stats (total / unread / by type)",        "?recipient=1", '{"total":10,"unread":3,"by_type":[{"notif_type":"payment","count":3},...]}'),
    ]),

    # ── 18. Society Admin — Dashboard ─────────────────────────────────────
    ("SOCIETY ADMIN — DASHBOARD", [
        ("GET", "/api/society-admin/dashboard/",
         "Society admin dashboard stats",
         "?society=9",
         '{"residents":120,"visitors_today":5,"open_complaints":3,"pending_payments":8}'),
    ]),

    # ── 17. Society Admin — Residents ─────────────────────────────────────
    ("SOCIETY ADMIN — RESIDENTS", [
        ("GET",    "/api/society-admin/residents/",       "List residents",     "?society=9&search=raj", '{"count":120,"results":[...]}'),
        ("POST",   "/api/society-admin/residents/",       "Add resident",       '{"full_name":"Raj Kumar","mobile":"+91...","flat":"<uuid>"}', '{"id":50,...}'),
        ("GET",    "/api/society-admin/residents/{id}/",  "Get resident",       "", '{"id":50,"full_name":"Raj Kumar",...}'),
        ("PATCH",  "/api/society-admin/residents/{id}/",  "Update resident",    '{"status":"inactive"}', '{"id":50,...}'),
        ("DELETE", "/api/society-admin/residents/{id}/",  "Delete resident",    "", "HTTP 204"),
    ]),

    # ── 20. Society Admin — Other Modules (stub) ─────────────────────────
    ("SOCIETY ADMIN — OTHER MODULES", [
        ("GET",  "/api/society-admin/staff-guards/",          "List staff/guards",       "", '{"count":5,...}'),
        ("GET",  "/api/society-admin/vendors/",               "List vendors",            "", '{"count":10,...}'),
        ("GET",  "/api/society-admin/complaints/",            "List complaints",         "", '{"count":15,...}'),
        ("POST", "/api/society-admin/complaints/",            "File complaint",          '{"title":"Water leak","description":"...","society":9}', '{"id":7,...}'),
        ("GET",  "/api/society-admin/payments/",              "List payments",           "", '{"count":100,...}'),
        ("GET",  "/api/society-admin/analytics/",             "Analytics data",          "?period=monthly", '{"visitors_trend":[...],...}'),
        ("GET",  "/api/society-admin/roles-access/",          "Society role config",     "", '{"results":[...]}'),
        ("GET",  "/api/society-admin/audit-logs/",            "Society audit trail",     "?category=create", '{"count":200,...}'),
        ("GET",  "/api/society-admin/settings/",              "Society settings",        "", '{"id":1,"society":9,...}'),
        ("PATCH","/api/society-admin/settings/{id}/",         "Update society settings", '{"allow_guest_entry":true}', '{"id":1,...}'),
    ]),

    # ── 21. Security Guard ────────────────────────────────────────────────
    ("SECURITY GUARD", [
        ("GET",  "/api/security-guard/dashboard/",          "Guard dashboard stats",     "", '{"active_visitors":3,...}'),
        ("GET",  "/api/security-guard/gate-entry/",         "Gate entry log",            "", '{"count":50,...}'),
        ("POST", "/api/security-guard/gate-entry/",         "Log gate entry",            '{"visitor":1,"type":"entry"}', '{"id":10,...}'),
        ("GET",  "/api/security-guard/visitor-log/",        "Full visitor log",          "", '{"count":200,...}'),
        ("GET",  "/api/security-guard/vehicle-tracking/",   "Vehicle tracking log",      "", '{"count":30,...}'),
        ("GET",  "/api/security-guard/emergency-alerts/",   "Emergency alerts",          "", '{"count":2,...}'),
        ("POST", "/api/security-guard/emergency-alerts/",   "Raise emergency alert",     '{"type":"fire","location":"Tower A lobby"}', '{"id":5,...}'),
        ("GET",  "/api/security-guard/shift-management/",   "Shift schedule",            "", '{"shifts":[...]}'),
    ]),
]


def create_report(filename="MiniGate_API_Report.xlsx"):
    wb = openpyxl.Workbook()

    # ── Sheet 1: API Report ───────────────────────────────────────────────
    ws = wb.active
    ws.title = "API Report"

    # Column widths
    ws.column_dimensions["A"].width = 10   # Method
    ws.column_dimensions["B"].width = 55   # URL
    ws.column_dimensions["C"].width = 40   # Description
    ws.column_dimensions["D"].width = 50   # Request Body
    ws.column_dimensions["E"].width = 55   # Response Example

    # Freeze top row
    ws.freeze_panes = "A2"

    # Column headers
    col_headers = ["Method", "URL / Endpoint", "Description", "Request Body (JSON)", "Response Example"]
    for col, hdr in enumerate(col_headers, 1):
        cell = ws.cell(row=1, column=col, value=hdr)
        cell.font = Font(bold=True, color=CLR["FONT_W"], size=11)
        cell.fill = PatternFill("solid", fgColor=CLR["COL_HDR"])
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[1].height = 24

    row = 2
    for section_name, apis in SECTIONS:
        # Section header row
        cell = ws.cell(row=row, column=1, value=section_name)
        cell.font = Font(bold=True, color=CLR["FONT_W"], size=12)
        cell.fill = PatternFill("solid", fgColor=CLR["HEADER"])
        cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=5)
        ws.row_dimensions[row].height = 20
        row += 1

        for method, url, description, body, response in apis:
            bg = CLR.get(method, "FFFFFF")
            fg = METHOD_FONT.get(method, "000000")

            cells_data = [method, url, description, body, response]
            for col, val in enumerate(cells_data, 1):
                c = ws.cell(row=row, column=col, value=val)
                c.fill = PatternFill("solid", fgColor=bg)
                c.border = BORDER
                c.alignment = Alignment(vertical="center", wrap_text=True)
                if col == 1:
                    c.font = Font(bold=True, color=fg, size=10)
                    c.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    c.font = Font(color="212121", size=9)
            ws.row_dimensions[row].height = 36
            row += 1

    # ── Sheet 2: Summary ─────────────────────────────────────────────────
    ws2 = wb.create_sheet("Summary")
    ws2.column_dimensions["A"].width = 30
    ws2.column_dimensions["B"].width = 12
    ws2.column_dimensions["C"].width = 12
    ws2.column_dimensions["D"].width = 12
    ws2.column_dimensions["E"].width = 12
    ws2.column_dimensions["F"].width = 12
    ws2.column_dimensions["G"].width = 16

    # Title
    ws2.merge_cells("A1:G1")
    title_cell = ws2["A1"]
    title_cell.value = f"MiniGate API Summary  —  Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    title_cell.font = Font(bold=True, color=CLR["FONT_W"], size=14)
    title_cell.fill = PatternFill("solid", fgColor=CLR["HEADER"])
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 30

    # Column headers
    s_headers = ["Section", "GET", "POST", "PUT", "PATCH", "DELETE", "Total"]
    for col, h in enumerate(s_headers, 1):
        c = ws2.cell(row=2, column=col, value=h)
        c.font = Font(bold=True, color=CLR["FONT_W"], size=10)
        c.fill = PatternFill("solid", fgColor=CLR["COL_HDR"])
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER
    ws2.row_dimensions[2].height = 20

    grand_total = [0] * 5  # GET POST PUT PATCH DELETE
    s_row = 3
    for section_name, apis in SECTIONS:
        counts = {"GET": 0, "POST": 0, "PUT": 0, "PATCH": 0, "DELETE": 0}
        for method, *_ in apis:
            counts[method] = counts.get(method, 0) + 1

        row_vals = [section_name, counts["GET"], counts["POST"], counts["PUT"], counts["PATCH"], counts["DELETE"],
                    sum(counts.values())]
        for col, val in enumerate(row_vals, 1):
            c = ws2.cell(row=s_row, column=col, value=val)
            c.border = BORDER
            c.alignment = Alignment(horizontal="center" if col > 1 else "left", vertical="center")
            c.font = Font(size=9)
            if col > 1 and col < 7 and val > 0:
                method_key = ["GET", "POST", "PUT", "PATCH", "DELETE"][col - 2]
                c.fill = PatternFill("solid", fgColor=CLR[method_key])
                c.font = Font(color=METHOD_FONT[method_key], bold=True, size=9)
        ws2.row_dimensions[s_row].height = 18

        for i, m in enumerate(["GET", "POST", "PUT", "PATCH", "DELETE"]):
            grand_total[i] += counts[m]
        s_row += 1

    # Grand total row
    total_row = ["TOTAL"] + grand_total + [sum(grand_total)]
    for col, val in enumerate(total_row, 1):
        c = ws2.cell(row=s_row, column=col, value=val)
        c.font = Font(bold=True, color=CLR["FONT_W"], size=10)
        c.fill = PatternFill("solid", fgColor="37474F")
        c.border = BORDER
        c.alignment = Alignment(horizontal="center" if col > 1 else "left", vertical="center")
    ws2.row_dimensions[s_row].height = 22

    wb.save(filename)
    total_apis = sum(len(apis) for _, apis in SECTIONS)
    print(f"[OK] Saved: {filename}")
    print(f"  Sections : {len(SECTIONS)}")
    print(f"  Total APIs: {total_apis}")
    print(f"  Methods  : GET={grand_total[0]} POST={grand_total[1]} PUT={grand_total[2]} PATCH={grand_total[3]} DELETE={grand_total[4]}")


if __name__ == "__main__":
    create_report()
