# -*- coding: utf-8 -*-
"""
End-to-end API test runner for MiniGate Backend.
Run: python test_api_e2e.py
Server must already be running on http://127.0.0.1:8000
"""
import io
import sys
import time
from dataclasses import dataclass
from typing import Any, Optional

import requests

# Unique suffix to avoid plate-number collisions across test runs
_RUN = str(int(time.time()))[-5:]  # last 5 digits of epoch

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000"
PASS = " PASS"
FAIL = " FAIL"

# ── Known seed data ───────────────────────────────────────────────────────────
SA_EMAIL    = "superadmin@minigate.in"
SA_MOBILE   = "9000000001"
SOC_MOBILE  = "9000000002"    # society admin — society_id=11
RES_MOBILE  = "9100000001"    # Aarav Sharma, resident — profile_id=27, flat=A-101, soc=11
SOC_ID      = 11              # Greenwood Heights, active
FLAT_NUMBER = "A-101"         # Known flat in society 11
FLAT_UUID   = "0d241424-4712-4be2-8a1c-984cd3c2297b"  # flat A-101 in soc 11
RES_PROF_ID = 27              # Aarav Sharma profile PK
OTP         = "123456"
PASSWORD    = "123456"

results: list = []


# ── Helpers ───────────────────────────────────────────────────────────────────

@dataclass
class Result:
    phase:    str
    api:      str
    method:   str
    status:   int
    expected: Any
    actual:   Any
    ok:       bool
    note:     str = ""


def req(method, path, token=None, json_body=None, params=None,
        expected=200, label=None, phase="", show_fail=True):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = getattr(requests, method.lower())(
            url, json=json_body, params=params, headers=headers, timeout=10
        )
    except Exception as e:
        results.append(Result(phase=phase, api=path, method=method, status=0,
                               expected=expected, actual=None, ok=False, note=str(e)))
        print(f"{FAIL} [{method}] {label or path}  -- {e}")
        return None, None

    try:
        body = r.json()
    except Exception:
        body = r.text

    ok  = r.status_code == expected
    tag = PASS if ok else FAIL
    print(f"{tag} [{method}] {label or path}  status={r.status_code}"
          + (f"  (expected {expected})" if not ok else ""))
    if not ok and show_fail and isinstance(body, dict):
        for k, v in list(body.items())[:4]:
            print(f"        {k}: {v}")

    results.append(Result(phase=phase, api=path, method=method, status=r.status_code,
                           expected=expected, actual=body, ok=ok))
    return r.status_code, body


def check(cond, label, detail=""):
    ok  = bool(cond)
    tag = PASS if ok else FAIL
    print(f"{tag}  CHECK: {label}" + (f"  [{detail}]" if detail and not ok else ""))
    results.append(Result(phase="check", api=label, method="CHECK",
                           status=0, expected=True, actual=cond, ok=ok, note=detail))
    return ok


def section(title):
    print(f"\n{'='*72}")
    print(f"  {title}")
    print(f"{'='*72}")


def sub(title):
    print(f"\n  -- {title}")


def tokens_from(body) -> tuple[Optional[str], Optional[str]]:
    """Return (access, refresh) from login response."""
    if not isinstance(body, dict):
        return None, None
    t = body.get("tokens")
    if isinstance(t, dict):
        return t.get("access"), t.get("refresh")
    return body.get("access"), body.get("refresh")


def data_id(body) -> Optional[Any]:
    if not isinstance(body, dict):
        return None
    d = body.get("data") or body
    return d.get("id") if isinstance(d, dict) else None


def first_result(body) -> Optional[dict]:
    if not isinstance(body, dict):
        return None
    items = body.get("results") or body.get("data") or []
    return items[0] if isinstance(items, list) and items else None


# ── Shared state ──────────────────────────────────────────────────────────────
sa_token = sa_refresh = None
soc_token = None
res_token = None


# =============================================================================
# PHASE 1 — AUTH
# =============================================================================
section("PHASE 1 -- Authentication & Token Flow")

sub("1.1  Email + Password login (super admin)")
_, body = req("POST", "/api/accounts/login/email/",
              json_body={"email": SA_EMAIL, "password": PASSWORD},
              expected=200, label="Email login - super admin", phase="Auth")
sa_token, sa_refresh = tokens_from(body)
check(sa_token is not None, "Email login returns access token")
if body and isinstance(body, dict):
    d = body.get("data", {})
    check(isinstance(d.get("profile", d).get("role"), dict) or isinstance(d.get("role"), dict),
          "Login data.role is nested dict")
    check("tokens" in body, "Response has tokens key")

sub("1.2  Mobile + OTP login (super admin)")
_, mob_body = req("POST", "/api/accounts/login/mobile/",
                   json_body={"mobile": SA_MOBILE, "otp_code": OTP},
                   expected=200, label="Mobile OTP login - super admin", phase="Auth")
mob_access, mob_refresh = tokens_from(mob_body)
if not sa_token:
    sa_token, sa_refresh = mob_access, mob_refresh
check(mob_access is not None, "Mobile login returns access token")
if mob_body and isinstance(mob_body, dict):
    d = mob_body.get("data", {})
    check(isinstance(d.get("role"), dict), "Mobile login data.role nested dict",
          str(type(d.get("role"))))
    check(d.get("role", {}).get("slug") == "super-admin", "Mobile login role.slug == super-admin")
    check("home_route" in mob_body, "Mobile login returns home_route")
    check("features" in d, "Mobile login returns features list")
    check(d.get("society") is None or isinstance(d.get("society"), dict),
          "society is null or dict (not raw int)")

sub("1.3  Society admin login")
_, soc_body = req("POST", "/api/accounts/login/mobile/",
                   json_body={"mobile": SOC_MOBILE, "otp_code": OTP},
                   expected=200, label="Mobile OTP login - society admin", phase="Auth")
soc_token, _ = tokens_from(soc_body)
check(soc_token is not None, "Society admin login returns token")

sub("1.4  Resident login")
_, res_body = req("POST", "/api/accounts/login/mobile/",
                   json_body={"mobile": RES_MOBILE, "otp_code": OTP},
                   expected=200, label="Mobile OTP login - resident", phase="Auth")
res_token, _ = tokens_from(res_body)
check(res_token is not None, "Resident login returns token")

sub("1.5  GET /me/ -- valid token")
_, me_body = req("GET", "/api/accounts/me/",
                  token=sa_token, expected=200, label="GET /me/ super admin", phase="Auth")
if me_body:
    check("success" in me_body, "/me/ has success key")
    d = me_body.get("data") or {}
    check(isinstance(d.get("role"), dict), "/me/ role is nested dict",
          str(type(d.get("role"))))
    check(d.get("role", {}).get("slug") == "super-admin", "/me/ role.slug == super-admin")

sub("1.6  GET /me/ -- no token -> 401")
req("GET", "/api/accounts/me/", expected=401,
    label="GET /me/ without token -> 401", phase="Auth")

sub("1.7  Token Refresh")
_, ref_body = req("POST", "/api/accounts/token/refresh/",
                   json_body={"refresh": sa_refresh},
                   expected=200, label="Token refresh", phase="Auth")
new_access, _ = tokens_from(ref_body)
new_access = new_access or (ref_body.get("access") if isinstance(ref_body, dict) else None)
check(new_access is not None, "Refresh returns new access token",
      str(ref_body)[:100] if not new_access else "")

sub("1.8  Wrong OTP -> 400")
req("POST", "/api/accounts/login/mobile/",
    json_body={"mobile": SA_MOBILE, "otp_code": "000000"},
    expected=400, label="Wrong OTP -> 400", phase="Auth")

sub("1.9  Missing mobile field -> 400")
req("POST", "/api/accounts/login/mobile/",
    json_body={"otp_code": OTP},
    expected=400, label="Missing mobile -> 400", phase="Auth")

sub("1.10 Bogus JWT -> 401")
req("GET", "/api/accounts/me/",
    token="bad.token.value", expected=401,
    label="Bogus JWT -> 401", phase="Auth")

sub("1.11 OTP Send flow")
req("POST", "/api/accounts/otp/send/",
    json_body={"mobile": SA_MOBILE},
    expected=200, label="OTP send", phase="Auth")

sub("1.12 Onboarding lookups (public, no auth)")
req("GET", "/api/accounts/onboarding/countries/", expected=200,
    label="Countries list", phase="Auth")
req("GET", "/api/accounts/onboarding/cities/", expected=200,
    label="Cities list", phase="Auth")
req("GET", "/api/accounts/onboarding/societies/", expected=200,
    label="Societies list", phase="Auth")
req("GET", "/api/accounts/onboarding/buildings/",
    params={"society": SOC_ID}, expected=200,
    label="Buildings for society", phase="Auth")
_, fl = req("GET", "/api/accounts/onboarding/flats/",
             params={"society": SOC_ID}, expected=200,
             label="Flats for society", phase="Auth")
if fl:
    check(fl.get("count", 0) > 0, "Onboarding flats list is non-empty")

sub("1.13 Approval status endpoint")
req("GET", "/api/accounts/onboarding/approval-status/",
    params={"mobile": SA_MOBILE},
    expected=200, label="Approval status for known mobile", phase="Auth")
req("GET", "/api/accounts/onboarding/approval-status/",
    params={"mobile": "0000000000"},
    expected=404, label="Approval status unknown mobile -> 404", phase="Auth")

sub("1.14 Resident /me/ profile")
_, res_me = req("GET", "/api/accounts/me/",
                 token=res_token, expected=200, label="GET /me/ resident", phase="Auth")
if res_me:
    d = res_me.get("data") or {}
    check(isinstance(d.get("role"), dict), "Resident /me/ role nested dict")
    check(d.get("role", {}).get("slug") == "resident", "Resident role slug == resident")

sub("1.15 My home screen (resident)")
req("GET", "/api/accounts/my-home/",
    params={"mobile": RES_MOBILE}, expected=200,
    label="My home (resident)", phase="Auth")


# =============================================================================
# PHASE 2 -- PLATFORM ADMIN
# =============================================================================
section("PHASE 2 -- Platform Admin APIs")

if not sa_token:
    print("  !! No super-admin token - skipping phase 2")
else:
    sub("2.1  Subscription Plans -- list")
    _, plans = req("GET", "/api/platform-admin/subscription-plans/",
                    token=sa_token, expected=200, label="List plans", phase="PlatformAdmin")
    if plans:
        print(f"        {plans.get('count', 0)} plans")

    sub("2.2  Subscription Plans -- create + CRUD")
    _, new_plan = req("POST", "/api/platform-admin/subscription-plans/",
                       token=sa_token,
                       json_body={"name": "E2E Test Plan", "slug": "e2e-test",
                                  "monthly_price": "999.00", "annual_price": "9990.00",
                                  "max_flats": 100, "status": "active",
                                  "features": ["E2E Feature A"]},
                       expected=201, label="Create plan", phase="PlatformAdmin")
    new_plan_id = data_id(new_plan) or (new_plan.get("id") if isinstance(new_plan, dict) else None)

    if new_plan_id:
        req("GET", f"/api/platform-admin/subscription-plans/{new_plan_id}/",
            token=sa_token, expected=200, label="Retrieve plan", phase="PlatformAdmin")
        req("PATCH", f"/api/platform-admin/subscription-plans/{new_plan_id}/",
            token=sa_token, json_body={"monthly_price": "1099.00"},
            expected=200, label="Partial update plan", phase="PlatformAdmin")
        _, del_plan = req("DELETE", f"/api/platform-admin/subscription-plans/{new_plan_id}/",
            token=sa_token, expected=200, label="Delete plan -> 200 + message", phase="PlatformAdmin")
        if del_plan:
            check(del_plan.get("success") is True, "Plan delete returns success:true")

    sub("2.3  Societies -- list + filters")
    _, soc_list = req("GET", "/api/platform-admin/create-society/societies/",
                       token=sa_token, expected=200, label="List societies", phase="PlatformAdmin")
    if soc_list:
        print(f"        {soc_list.get('count', 0)} societies")

    req("GET", "/api/platform-admin/create-society/societies/",
        token=sa_token, params={"status": "active"},
        expected=200, label="Filter by status=active", phase="PlatformAdmin")
    req("GET", "/api/platform-admin/create-society/societies/",
        token=sa_token, params={"plan": "pro"},
        expected=200, label="Filter by plan=pro", phase="PlatformAdmin")
    req("GET", "/api/platform-admin/create-society/societies/",
        token=sa_token, params={"search": "Greenwood"},
        expected=200, label="Search societies", phase="PlatformAdmin")

    sub("2.4  Society -- retrieve & update existing")
    req("GET", f"/api/platform-admin/create-society/societies/{SOC_ID}/",
        token=sa_token, expected=200, label=f"Retrieve society id={SOC_ID}", phase="PlatformAdmin")
    req("PATCH", f"/api/platform-admin/create-society/societies/{SOC_ID}/",
        token=sa_token, json_body={"admin_email": "greenwood@minigate.dev"},
        expected=200, label="Partial update society", phase="PlatformAdmin")

    sub("2.5  Society -- create new")
    _, new_soc = req("POST", "/api/platform-admin/create-society/societies/",
                      token=sa_token,
                      json_body={"name": f"E2E Society {_RUN}", "city": 1,
                                 "plan": "free", "total_flats": 20,
                                 "admin_email": f"e2esoc{_RUN}@test.com"},
                      expected=201, label="Create society", phase="PlatformAdmin")
    new_soc_id = data_id(new_soc) or (new_soc.get("id") if isinstance(new_soc, dict) else None)
    if new_soc_id:
        req("PATCH", f"/api/platform-admin/create-society/societies/{new_soc_id}/",
            token=sa_token, json_body={"total_flats": 30},
            expected=200, label="Update new society", phase="PlatformAdmin")

    sub("2.6  Society not found -> 404")
    req("GET", "/api/platform-admin/create-society/societies/999999/",
        token=sa_token, expected=404, label="Non-existent -> 404", phase="PlatformAdmin")

    sub("2.7  Duplicate society name -> 400")
    req("POST", "/api/platform-admin/create-society/societies/",
        token=sa_token,
        json_body={"name": "Greenwood Heights", "city": 19,
                   "plan": "free", "total_flats": 10, "admin_email": "dup@t.com"},
        expected=400, label="Duplicate name -> 400", phase="PlatformAdmin")

    sub("2.8  Society Management view")
    req("GET", "/api/platform-admin/society-management/",
        token=sa_token, expected=200, label="Society management list", phase="PlatformAdmin")

    sub("2.9  Global Users")
    _, gu = req("GET", "/api/platform-admin/global-users/",
                 token=sa_token, expected=200, label="Global users", phase="PlatformAdmin")
    if gu:
        print(f"        {gu.get('count', 0)} users")

    sub("2.10 Dashboard Stats")
    _, dash = req("GET", "/api/platform-admin/dashboard/stats/",
                   token=sa_token, expected=200, label="Dashboard stats", phase="PlatformAdmin")
    if dash:
        print(f"        keys: {list(dash.keys())[:6]}")
    req("GET", "/api/platform-admin/dashboard/societies/",
        token=sa_token, expected=200, label="Dashboard societies", phase="PlatformAdmin")

    sub("2.11 Global Reports (sub-endpoints)")
    req("GET", "/api/platform-admin/global-reports/overview/",
        token=sa_token, expected=200, label="Global reports overview", phase="PlatformAdmin")
    req("GET", "/api/platform-admin/global-reports/revenue/",
        token=sa_token, expected=200, label="Global reports revenue", phase="PlatformAdmin")
    req("GET", "/api/platform-admin/global-reports/society-growth/",
        token=sa_token, expected=200, label="Global reports society growth", phase="PlatformAdmin")

    sub("2.12 Audit Logs")
    req("GET", "/api/platform-admin/audit-logs/",
        token=sa_token, expected=200, label="Platform audit logs", phase="PlatformAdmin")

    sub("2.13 System Settings (GET + PATCH)")
    req("GET", "/api/platform-admin/system-settings/",
        token=sa_token, expected=200, label="System settings GET", phase="PlatformAdmin")
    req("PATCH", "/api/platform-admin/system-settings/",
        token=sa_token, json_body={"maintenance_mode": False},
        expected=200, label="System settings PATCH", phase="PlatformAdmin")

    sub("2.14 Roles & Permissions CRUD")
    _, roles = req("GET", "/api/roles-permissions/roles/",
                    token=sa_token, expected=200, label="List roles", phase="PlatformAdmin")
    role_id = None
    if roles:
        item = first_result(roles)
        role_id = item.get("id") if item else None
    if role_id:
        req("GET", f"/api/roles-permissions/roles/{role_id}/",
            token=sa_token, expected=200, label="Retrieve role", phase="PlatformAdmin")

    req("GET", "/api/roles-permissions/users/",
        token=sa_token, expected=200, label="List user profiles", phase="PlatformAdmin")

    sub("2.15 Auth Guards")
    req("GET", "/api/platform-admin/dashboard/stats/",
        expected=401, label="No token -> 401", phase="PlatformAdmin")
    if res_token:
        req("GET", "/api/platform-admin/dashboard/stats/",
            token=res_token, expected=403,
            label="Resident on super-admin endpoint -> 403", phase="PlatformAdmin")


# =============================================================================
# PHASE 3 -- SOCIETY ADMIN
# =============================================================================
section("PHASE 3 -- Society Admin APIs")

_tok = soc_token or sa_token
_sp  = {"society": SOC_ID}

if not _tok:
    print("  !! No token - skipping phase 3")
else:
    sub("3.1  Dashboard (with ?society=)")
    _, sa_dash = req("GET", "/api/society-admin/dashboard/",
                      token=_tok, params=_sp,
                      expected=200, label="Society admin dashboard", phase="SocAdmin")
    if sa_dash:
        print(f"        keys: {list(sa_dash.keys())[:6]}")

    sub("3.2  Dashboard (no ?society= -- auto-detect from profile)")
    if soc_token:
        req("GET", "/api/society-admin/dashboard/",
            token=soc_token, expected=200,
            label="Dashboard auto-detect society from profile", phase="SocAdmin")

    sub("3.3  Buildings -- list (scoped to society)")
    _, bld_list = req("GET", "/api/society-admin/buildings/",
                       token=_tok, params=_sp,
                       expected=200, label="List buildings for society 11", phase="SocAdmin")
    bld_id = None
    if bld_list:
        item = first_result(bld_list)
        if item:
            bld_id = item.get("id")
            print(f"        building id={bld_id} name={item.get('name')}")

    sub("3.4  Flats -- list (scoped to society)")
    _, flat_list = req("GET", "/api/society-admin/flats/",
                        token=_tok, params=_sp,
                        expected=200, label="List flats for society 11", phase="SocAdmin")
    api_flat_id = None
    api_flat_number = None
    if flat_list:
        item = first_result(flat_list)
        if item:
            api_flat_id     = item.get("id")
            api_flat_number = item.get("flat_number")
            print(f"        flat id={api_flat_id} number={api_flat_number}")
        check(api_flat_number == FLAT_NUMBER or api_flat_number is not None,
              "Flats endpoint returns flats from society 11",
              f"got flat_number={api_flat_number}")

    sub("3.5  Notice Board -- full CRUD")
    notice_id = None
    _, new_notice = req("POST", "/api/society-admin/notice-board/",
                         token=_tok,
                         json_body={"title": "E2E Test Notice", "content": "Test content.",
                                    "society": SOC_ID, "notice_type": "general",
                                    "priority": "normal", "is_published": True},
                         expected=201, label="Create notice", phase="SocAdmin")
    notice_id = data_id(new_notice)
    if notice_id is None and isinstance(new_notice, dict):
        notice_id = new_notice.get("id")

    req("GET", "/api/society-admin/notice-board/",
        token=_tok, params=_sp, expected=200, label="List notices", phase="SocAdmin")

    if notice_id:
        req("GET", f"/api/society-admin/notice-board/{notice_id}/",
            token=_tok, expected=200, label="Retrieve notice", phase="SocAdmin")
        req("PATCH", f"/api/society-admin/notice-board/{notice_id}/",
            token=_tok, json_body={"content": "Updated content."},
            expected=200, label="Partial update notice", phase="SocAdmin")
        _, del_r = req("DELETE", f"/api/society-admin/notice-board/{notice_id}/",
                        token=_tok, expected=200, label="Delete notice -> 200 + message", phase="SocAdmin")
        if del_r:
            check(del_r.get("success") is True, "DELETE notice returns success:true")
            check("message" in del_r, "DELETE notice returns message")

    sub("3.6  Complaints")
    req("GET", "/api/society-admin/complaints/",
        token=_tok, params=_sp, expected=200, label="List complaints", phase="SocAdmin")

    sub("3.7  Staff & Guards")
    req("GET", "/api/society-admin/staff-guards/",
        token=_tok, params=_sp, expected=200, label="Staff & guards", phase="SocAdmin")

    sub("3.8  Vendors")
    req("GET", "/api/society-admin/vendors/",
        token=_tok, params=_sp, expected=200, label="Vendors list", phase="SocAdmin")

    sub("3.9  Payments Overview")
    req("GET", "/api/society-admin/payments/overview/",
        token=_tok, params=_sp, expected=200, label="Payments overview", phase="SocAdmin")

    sub("3.10 Fund Dashboard")
    req("GET", "/api/society-admin/fund-dashboard/",
        token=_tok, params=_sp, expected=200, label="Fund dashboard", phase="SocAdmin")

    sub("3.11 Maintenance Expenses")
    req("GET", "/api/society-admin/maintenance-expenses/",
        token=_tok, params=_sp, expected=200, label="Maintenance expenses", phase="SocAdmin")

    sub("3.12 Monthly Statements")
    req("GET", "/api/society-admin/monthly-statements/",
        token=_tok, params=_sp, expected=200, label="Monthly statements", phase="SocAdmin")

    sub("3.13 Analytics")
    req("GET", "/api/society-admin/analytics/",
        token=_tok, params=_sp, expected=200, label="Analytics", phase="SocAdmin")

    sub("3.14 Residents (society admin view)")
    req("GET", "/api/society-admin/residents/",
        token=_tok, params=_sp, expected=200, label="Residents list", phase="SocAdmin")

    sub("3.15 Visitors")
    req("GET", "/api/society-admin/visitors/",
        token=_tok, params=_sp, expected=200, label="Visitors list", phase="SocAdmin")

    sub("3.16 Approvals queue")
    req("GET", "/api/society-admin/approvals/",
        token=_tok, params=_sp, expected=200, label="Approvals queue", phase="SocAdmin")

    sub("3.17 Security")
    req("GET", "/api/society-admin/security/",
        token=_tok, params=_sp, expected=200, label="Security overview", phase="SocAdmin")

    sub("3.18 Audit Logs")
    req("GET", "/api/society-admin/audit-logs/",
        token=_tok, params=_sp, expected=200, label="Society audit logs", phase="SocAdmin")

    sub("3.19 Roles & Access")
    req("GET", "/api/society-admin/roles-access/",
        token=_tok, params=_sp, expected=200, label="Roles & access", phase="SocAdmin")

    sub("3.20 Settings (GET + PATCH)")
    req("GET", "/api/society-admin/settings/",
        token=_tok, params=_sp, expected=200, label="Society settings GET", phase="SocAdmin")
    req("PATCH", "/api/society-admin/settings/",
        token=_tok, params=_sp,
        json_body={"admin_email": "greenwood@minigate.dev"},
        expected=200, label="Society settings PATCH", phase="SocAdmin")

    sub("3.21 Notifications")
    req("GET", "/api/society-admin/notifications/",
        token=_tok, params=_sp, expected=200, label="Notifications", phase="SocAdmin")


# =============================================================================
# PHASE 4 -- RESIDENT
# =============================================================================
section("PHASE 4 -- Resident APIs")

_rt  = res_token or sa_token
_fp  = {"flat": FLAT_UUID}
_sfp = {"society": SOC_ID, "flat": FLAT_UUID}

if not _rt:
    print("  !! No token - skipping phase 4")
else:
    sub("4.1  Resident Dashboard")
    _, r_dash = req("GET", "/api/resident/dashboard/",
                     token=_rt, params=_sfp,
                     expected=200, label="Resident dashboard", phase="Resident")

    sub("4.2  My Flats -- list")
    _, my_flats = req("GET", "/api/resident/profile/my-flats/",
                       token=_rt, expected=200, label="List my flats", phase="Resident")
    if my_flats:
        check("count" in my_flats and "results" in my_flats,
              "my-flats has count + results keys", str(list(my_flats.keys())))
        print(f"        {my_flats.get('count', 0)} flat link(s)")

    sub("4.3  My Flats -- add (create link)")
    flat_link_id = None
    _, add_resp = req("POST", "/api/resident/profile/my-flats/add/",
                       token=_rt,
                       json_body={"society_id": SOC_ID, "flat_number": FLAT_NUMBER},
                       expected=201, label=f"Add flat {FLAT_NUMBER}", phase="Resident")
    if add_resp:
        flat_link_id = data_id(add_resp)
        print(f"        flat_link_id={flat_link_id}")
        d = add_resp.get("data") or add_resp
        if isinstance(d, dict):
            check(d.get("status") == "pending", "New flat link status is pending")
            check(d.get("is_primary") in (True, False), "is_primary field present")

    sub("4.3b  Duplicate flat add -> 400")
    req("POST", "/api/resident/profile/my-flats/add/",
        token=_rt,
        json_body={"society_id": SOC_ID, "flat_number": FLAT_NUMBER},
        expected=400, label="Duplicate flat add -> 400", phase="Resident")

    sub("4.4  Switch pending flat -> 400")
    if flat_link_id:
        req("POST", f"/api/resident/profile/my-flats/{flat_link_id}/switch/",
            token=_rt, expected=400, label="Switch pending flat -> 400", phase="Resident")

    sub("4.5  Switch non-existent flat -> 404")
    req("POST", "/api/resident/profile/my-flats/999999/switch/",
        token=_rt, expected=404, label="Switch unknown flat -> 404", phase="Resident")

    sub("4.6  Remove flat link")
    if flat_link_id:
        _, rm_resp = req("DELETE", f"/api/resident/profile/my-flats/{flat_link_id}/remove/",
                          token=_rt, expected=200, label="Remove flat link -> 200", phase="Resident")
        if rm_resp:
            check(rm_resp.get("success") is True, "Remove flat returns success:true")

    sub("4.7  Remove non-existent flat -> 404")
    req("DELETE", "/api/resident/profile/my-flats/999999/remove/",
        token=_rt, expected=404, label="Remove unknown flat -> 404", phase="Resident")

    sub("4.8  Complaints -- list + CRUD")
    req("GET", "/api/resident/complaints/",
        token=_rt, params=_fp, expected=200, label="List complaints", phase="Resident")

    comp_id = None
    _, new_comp = req("POST", "/api/resident/complaints/",
                       token=_rt,
                       json_body={"title": "E2E Water Leak",
                                  "description": "Bathroom water leak",
                                  "category": "maintenance",
                                  "resident": RES_PROF_ID,
                                  "flat": FLAT_UUID,
                                  "society": SOC_ID},
                       expected=201, label="Create complaint", phase="Resident")
    if new_comp:
        d = new_comp.get("data") or new_comp
        comp_id = d.get("id") if isinstance(d, dict) else None
        if comp_id:
            check(isinstance(d.get("complaint_number"), str), "complaint_number generated")

    if comp_id:
        req("GET", f"/api/resident/complaints/{comp_id}/",
            token=_rt, expected=200, label="Retrieve complaint", phase="Resident")
        req("PATCH", f"/api/resident/complaints/{comp_id}/",
            token=_rt, json_body={"description": "Updated leak desc"},
            expected=200, label="Update complaint", phase="Resident")

    sub("4.9  Notices")
    req("GET", "/api/resident/notices/",
        token=_rt, params={"society": SOC_ID}, expected=200, label="Resident notices", phase="Resident")

    sub("4.10 Payments")
    req("GET", "/api/resident/payments/",
        token=_rt, params=_fp, expected=200, label="Resident payments", phase="Resident")

    sub("4.11 Visitors")
    req("GET", "/api/resident/visitors/",
        token=_rt, params=_fp, expected=200, label="Resident visitors", phase="Resident")

    sub("4.12 Profile -- Family Members CRUD")
    req("GET", "/api/resident/profile/family/",
        token=_rt, expected=200, label="List family members", phase="Resident")
    fam_id = None
    _, new_fam = req("POST", "/api/resident/profile/family/",
                      token=_rt,
                      json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                                 "name": "E2E Parent", "relation": "father",
                                 "phone": "9588801001"},
                      expected=201, label="Create family member", phase="Resident")
    if new_fam:
        d = new_fam.get("data") or new_fam
        fam_id = d.get("id") if isinstance(d, dict) else None

    if fam_id:
        req("GET", f"/api/resident/profile/family/{fam_id}/",
            token=_rt, expected=200, label="Retrieve family member", phase="Resident")
        req("PATCH", f"/api/resident/profile/family/{fam_id}/",
            token=_rt, json_body={"phone": "9588801002"},
            expected=200, label="Update family member", phase="Resident")
        req("DELETE", f"/api/resident/profile/family/{fam_id}/",
            token=_rt, expected=200, label="Delete family member -> 200", phase="Resident")

    sub("4.13 Profile -- Vehicles CRUD")
    req("GET", "/api/resident/profile/vehicles/",
        token=_rt, expected=200, label="List vehicles", phase="Resident")
    veh_id = None
    _, new_veh = req("POST", "/api/resident/profile/vehicles/",
                      token=_rt,
                      json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                                 "vehicle_name": "E2E Honda City",
                                 "vehicle_type": "car",
                                 "plate_number": f"E2E{_RUN}A",
                                 "parking_slot": "P99"},
                      expected=201, label="Create vehicle", phase="Resident")
    if new_veh:
        d = new_veh.get("data") or new_veh
        veh_id = d.get("id") if isinstance(d, dict) else None

    if veh_id:
        req("PATCH", f"/api/resident/profile/vehicles/{veh_id}/",
            token=_rt, json_body={"parking_slot": "P100"},
            expected=200, label="Update vehicle", phase="Resident")
        req("DELETE", f"/api/resident/profile/vehicles/{veh_id}/",
            token=_rt, expected=200, label="Delete vehicle", phase="Resident")

    sub("4.14 Profile -- Pets CRUD")
    req("GET", "/api/resident/profile/pets/",
        token=_rt, expected=200, label="List pets", phase="Resident")
    _, new_pet = req("POST", "/api/resident/profile/pets/",
                      token=_rt,
                      json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                                 "name": "Bruno", "pet_type": "dog",
                                 "gender": "male", "color": "brown"},
                      expected=201, label="Create pet", phase="Resident")
    pet_id = None
    if new_pet:
        d = new_pet.get("data") or new_pet
        pet_id = d.get("id") if isinstance(d, dict) else None
    if pet_id:
        req("DELETE", f"/api/resident/profile/pets/{pet_id}/",
            token=_rt, expected=200, label="Delete pet", phase="Resident")

    sub("4.15 Profile -- Daily Help CRUD")
    req("GET", "/api/resident/profile/daily-help/",
        token=_rt, expected=200, label="List daily help", phase="Resident")
    _, new_dh = req("POST", "/api/resident/profile/daily-help/",
                     token=_rt,
                     json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                                "name": "E2E Maid", "help_type": "maid",
                                "monthly_salary": "5000.00", "status": "active"},
                     expected=201, label="Create daily help", phase="Resident")
    dh_id = None
    if new_dh:
        d = new_dh.get("data") or new_dh
        dh_id = d.get("id") if isinstance(d, dict) else None
    if dh_id:
        req("DELETE", f"/api/resident/profile/daily-help/{dh_id}/",
            token=_rt, expected=200, label="Delete daily help", phase="Resident")

    sub("4.16 SOS")
    req("GET", "/api/resident/sos/",
        token=_rt, params=_fp, expected=200, label="SOS list", phase="Resident")

    sub("4.17 Maintenance Transparency")
    req("GET", "/api/resident/maintenance-transparency/",
        token=_rt, params=_sfp, expected=200, label="Maintenance transparency", phase="Resident")

    sub("4.18 Auth Guard -- resident on admin endpoint -> 403")
    req("GET", "/api/platform-admin/dashboard/stats/",
        token=_rt, expected=403, label="Resident on super-admin -> 403", phase="Resident")

    sub("4.19 Cross-role -- soc-admin on resident endpoint -> 403")
    if soc_token:
        req("GET", "/api/resident/sos/",
            token=soc_token, params=_fp, expected=403,
            label="Soc-admin on resident endpoint -> 403", phase="Resident")


# =============================================================================
# PHASE 5 -- EDGE CASES
# =============================================================================
section("PHASE 5 -- Edge Cases & Error Handling")

sub("5.1  Invalid JSON body -> 400")
try:
    r = requests.post(f"{BASE}/api/accounts/login/email/",
                      data="not{{json", headers={"Content-Type": "application/json"}, timeout=5)
    ok  = r.status_code == 400
    print(f"{PASS if ok else FAIL} [POST] Invalid JSON body -> {r.status_code} (expected 400)")
    results.append(Result(phase="Edge", api="/accounts/login/email/", method="POST",
                           status=r.status_code, expected=400, actual=r.text[:80], ok=ok))
except Exception as e:
    print(f"{FAIL} Invalid JSON test -- {e}")

sub("5.2  Non-existent resource -> 404")
if sa_token:
    req("GET", "/api/platform-admin/create-society/societies/999999/",
        token=sa_token, expected=404, label="Non-existent society -> 404", phase="Edge")
    req("GET", "/api/platform-admin/subscription-plans/999999/",
        token=sa_token, expected=404, label="Non-existent plan -> 404", phase="Edge")
    req("GET", "/api/society-admin/notice-board/999999/",
        token=soc_token or sa_token, expected=404, label="Non-existent notice -> 404", phase="Edge")

sub("5.3  Method Not Allowed -> 405")
if sa_token:
    req("DELETE", "/api/platform-admin/dashboard/stats/",
        token=sa_token, expected=405, label="DELETE on read-only view -> 405", phase="Edge")

sub("5.4  Duplicate society name -> 400")
if sa_token:
    req("POST", "/api/platform-admin/create-society/societies/",
        token=sa_token,
        json_body={"name": "Greenwood Heights", "city": 19,
                   "plan": "free", "total_flats": 5, "admin_email": "dup@t.com"},
        expected=400, label="Duplicate society name -> 400", phase="Edge")

sub("5.5  Vehicle unique plate constraint")
if res_token:
    # Create a vehicle
    _dup_plate = f"DUP{_RUN}B"
    _, v1 = req("POST", "/api/resident/profile/vehicles/",
                 token=res_token,
                 json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                             "vehicle_name": "Car A", "vehicle_type": "car",
                             "plate_number": _dup_plate},
                 expected=201, label=f"Create vehicle (plate {_dup_plate})", phase="Edge")
    req("POST", "/api/resident/profile/vehicles/",
        token=res_token,
        json_body={"resident": RES_PROF_ID, "flat": FLAT_UUID,
                    "vehicle_name": "Car B", "vehicle_type": "car",
                    "plate_number": _dup_plate},
        expected=400, label="Duplicate plate -> 400", phase="Edge")
    if v1:
        d = v1.get("data") or v1
        vid = d.get("id") if isinstance(d, dict) else None
        if vid:
            req("DELETE", f"/api/resident/profile/vehicles/{vid}/",
                token=res_token, expected=200, label="Cleanup dup vehicle", phase="Edge")

sub("5.6  Add flat with bad society_id -> 400")
if res_token:
    req("POST", "/api/resident/profile/my-flats/add/",
        token=res_token,
        json_body={"society_id": 999999, "flat_number": "X999"},
        expected=400, label="Add flat bad society -> 400", phase="Edge")

sub("5.7  Add flat with unknown flat_number -> 400")
if res_token:
    req("POST", "/api/resident/profile/my-flats/add/",
        token=res_token,
        json_body={"society_id": SOC_ID, "flat_number": "ZZZNOTEXIST"},
        expected=400, label="Add flat unknown flat_number -> 400", phase="Edge")


# =============================================================================
# PHASE 6 -- RESIDENT ONBOARDING FULL FLOW
# =============================================================================
section("PHASE 6 -- Resident Onboarding Full Flow")

NEW_MOBILE = "9677701234"

sub("6.1  Send OTP to new mobile")
req("POST", "/api/accounts/otp/send/",
    json_body={"mobile": NEW_MOBILE},
    expected=200, label="OTP send for new mobile", phase="Onboarding")

sub("6.2  Verify OTP (marks is_verified=True in DB)")
_, vfy = req("POST", "/api/accounts/otp/verify/",
              json_body={"mobile": NEW_MOBILE, "otp_code": OTP},
              expected=200, label="OTP verify -> is_verified persisted", phase="Onboarding")
if vfy:
    check(vfy.get("success") is True, "OTP verify returns success:true")

sub("6.3  Wrong OTP verify -> 400")
req("POST", "/api/accounts/otp/verify/",
    json_body={"mobile": "9677701235", "otp_code": "000000"},
    expected=400, label="Wrong OTP verify -> 400", phase="Onboarding")

sub("6.4  Complete onboarding (requires verified OTP)")
_, ob = req("POST", "/api/accounts/onboarding/complete/",
             json_body={"mobile": NEW_MOBILE, "full_name": "E2E New Resident",
                        "country_id": 1, "city_id": 1, "society_id": SOC_ID,
                        "flat_number": FLAT_NUMBER},
             expected=201, label="Onboarding complete -> 201 PENDING", phase="Onboarding")
if ob and isinstance(ob, dict):
    check("tokens" in ob, "Onboarding returns tokens", str(list(ob.keys())))
    check("data" in ob, "Onboarding returns data")
    d = ob.get("data") or {}
    check(d.get("status") == "pending", f"New resident status=pending (got {d.get('status')})")

sub("6.5  Poll approval status for new resident")
req("GET", "/api/accounts/onboarding/approval-status/",
    params={"mobile": NEW_MOBILE},
    expected=200, label="Approval status poll -> 200", phase="Onboarding")

sub("6.6  Pending resident cannot login -> 403")
req("POST", "/api/accounts/login/mobile/",
    json_body={"mobile": NEW_MOBILE, "otp_code": OTP},
    expected=403, label="Pending resident login -> 403", phase="Onboarding")

sub("6.7  Re-submit onboarding (idempotent) -> existing account returned")
req("POST", "/api/accounts/onboarding/complete/",
    json_body={"mobile": NEW_MOBILE, "full_name": "E2E New Resident",
               "country_id": 1, "city_id": 1, "society_id": SOC_ID,
               "flat_number": FLAT_NUMBER},
    expected=201, label="Re-submit onboarding -> 201 (idempotent)", phase="Onboarding")


# =============================================================================
# SUMMARY
# =============================================================================
section("TEST SUMMARY")

total  = len(results)
passed = sum(1 for r in results if r.ok)
failed = sum(1 for r in results if not r.ok)

print(f"\n  Total  : {total}")
print(f"  Passed : {passed}  ({100*passed//total if total else 0}%)")
print(f"  Failed : {failed}")

if failed:
    print(f"\n  {'='*60}")
    print("  FAILURES")
    print(f"  {'='*60}")
    for r in results:
        if not r.ok:
            print(f"\n  {FAIL} [{r.method}] [{r.phase}] {r.api}")
            print(f"         got={r.status}  expected={r.expected}")
            if isinstance(r.actual, dict):
                for k, v in list(r.actual.items())[:4]:
                    print(f"         {k}: {v}")
            elif isinstance(r.actual, str) and r.actual:
                print(f"         body: {r.actual[:120]}")
            if r.note:
                print(f"         note: {r.note}")

sys.exit(0 if failed == 0 else 1)
