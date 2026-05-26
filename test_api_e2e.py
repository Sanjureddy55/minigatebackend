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

_RUN = str(int(time.time()))[-5:]  # last 5 digits of epoch — avoids collisions

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000"
PASS = " PASS"
FAIL = " FAIL"

# ── Known seed data ───────────────────────────────────────────────────────────
SA_EMAIL    = "superadmin@minigate.in"
SA_MOBILE   = "9000000001"
SOC_MOBILE  = "9000000002"    # society admin — society_id=11
ACCT_MOBILE = "9000000003"    # accountant — same society 11  (update if different)
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
            url, json=json_body, params=params, headers=headers, timeout=15
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

    expected_set = expected if isinstance(expected, (list, tuple)) else [expected]
    ok  = r.status_code in expected_set
    tag = PASS if ok else FAIL
    exp_str = str(expected) if isinstance(expected, int) else "|".join(str(e) for e in expected)
    print(f"{tag} [{method}] {label or path}  status={r.status_code}"
          + (f"  (expected {exp_str})" if not ok else ""))
    if not ok and show_fail and isinstance(body, dict):
        for k, v in list(body.items())[:4]:
            print(f"        {k}: {v}")

    results.append(Result(phase=phase, api=path, method=method, status=r.status_code,
                           expected=expected, actual=body, ok=ok))
    return r.status_code, body


def req_binary(method, path, token=None, params=None, expected=200,
               label=None, phase=""):
    """Like req() but doesn't try to parse JSON — used for PDF/CSV/XML downloads."""
    url = BASE + path
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = getattr(requests, method.lower())(
            url, params=params, headers=headers, timeout=20, stream=True
        )
    except Exception as e:
        results.append(Result(phase=phase, api=path, method=method, status=0,
                               expected=expected, actual=None, ok=False, note=str(e)))
        print(f"{FAIL} [{method}] {label or path}  -- {e}")
        return None, None

    ok  = r.status_code == expected
    tag = PASS if ok else FAIL
    ct  = r.headers.get("Content-Type", "")
    cd  = r.headers.get("Content-Disposition", "")
    size = len(r.content)
    print(f"{tag} [{method}] {label or path}  status={r.status_code}"
          + (f"  (expected {expected})" if not ok else "")
          + f"  bytes={size}  ct={ct[:40]}")
    note = f"content-disposition={cd[:80]}"
    results.append(Result(phase=phase, api=path, method=method, status=r.status_code,
                           expected=expected, actual={"bytes": size, "ct": ct}, ok=ok, note=note))
    return r.status_code, r.content


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
acct_token = None


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

sub("1.4  Accountant login")
_, acct_body = req("POST", "/api/accounts/login/mobile/",
                    json_body={"mobile": ACCT_MOBILE, "otp_code": OTP},
                    expected=200, label="Mobile OTP login - accountant", phase="Auth")
acct_token, _ = tokens_from(acct_body)
if not acct_token:
    # Fallback to society-admin token (also has IsAccountant permission)
    acct_token = soc_token
    print("        [INFO] Accountant login failed — using society-admin token as fallback")
else:
    check(acct_token is not None, "Accountant login returns token")
    if acct_body and isinstance(acct_body, dict):
        d = acct_body.get("data", {})
        check(d.get("role", {}).get("slug") == "accountant", "Accountant role.slug == accountant")
        check(d.get("society") is not None, "Accountant has society linked")

sub("1.5  Resident login")
_, res_body = req("POST", "/api/accounts/login/mobile/",
                   json_body={"mobile": RES_MOBILE, "otp_code": OTP},
                   expected=200, label="Mobile OTP login - resident", phase="Auth")
res_token, _ = tokens_from(res_body)
check(res_token is not None, "Resident login returns token")

sub("1.6  GET /me/ -- valid token")
_, me_body = req("GET", "/api/accounts/me/",
                  token=sa_token, expected=200, label="GET /me/ super admin", phase="Auth")
if me_body:
    check("success" in me_body, "/me/ has success key")
    d = me_body.get("data") or {}
    check(isinstance(d.get("role"), dict), "/me/ role is nested dict",
          str(type(d.get("role"))))
    check(d.get("role", {}).get("slug") == "super-admin", "/me/ role.slug == super-admin")

sub("1.7  GET /me/ -- no token -> 401")
req("GET", "/api/accounts/me/", expected=401,
    label="GET /me/ without token -> 401", phase="Auth")

sub("1.8  Token Refresh")
_, ref_body = req("POST", "/api/accounts/token/refresh/",
                   json_body={"refresh": sa_refresh},
                   expected=200, label="Token refresh", phase="Auth")
new_access, _ = tokens_from(ref_body)
new_access = new_access or (ref_body.get("access") if isinstance(ref_body, dict) else None)
check(new_access is not None, "Refresh returns new access token",
      str(ref_body)[:100] if not new_access else "")

sub("1.9  Wrong OTP -> 400")
req("POST", "/api/accounts/login/mobile/",
    json_body={"mobile": SA_MOBILE, "otp_code": "000000"},
    expected=400, label="Wrong OTP -> 400", phase="Auth")

sub("1.10 Missing mobile field -> 400")
req("POST", "/api/accounts/login/mobile/",
    json_body={"otp_code": OTP},
    expected=400, label="Missing mobile -> 400", phase="Auth")

sub("1.11 Bogus JWT -> 401")
req("GET", "/api/accounts/me/",
    token="bad.token.value", expected=401,
    label="Bogus JWT -> 401", phase="Auth")

sub("1.12 OTP Send flow")
req("POST", "/api/accounts/otp/send/",
    json_body={"mobile": SA_MOBILE},
    expected=200, label="OTP send", phase="Auth")

sub("1.13 Onboarding lookups (public, no auth)")
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

sub("1.14 Approval status endpoint")
req("GET", "/api/accounts/onboarding/approval-status/",
    params={"mobile": SA_MOBILE},
    expected=200, label="Approval status for known mobile", phase="Auth")
req("GET", "/api/accounts/onboarding/approval-status/",
    params={"mobile": "0000000000"},
    expected=404, label="Approval status unknown mobile -> 404", phase="Auth")

sub("1.15 Resident /me/ profile")
_, res_me = req("GET", "/api/accounts/me/",
                 token=res_token, expected=200, label="GET /me/ resident", phase="Auth")
if res_me:
    d = res_me.get("data") or {}
    check(isinstance(d.get("role"), dict), "Resident /me/ role nested dict")
    check(d.get("role", {}).get("slug") == "resident", "Resident role slug == resident")

sub("1.16 My home screen (resident)")
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
    api_flat_id = api_flat_number = None
    if flat_list:
        item = first_result(flat_list)
        if item:
            api_flat_id     = item.get("id")
            api_flat_number = item.get("flat_number")
            print(f"        flat id={api_flat_id} number={api_flat_number}")
        check(api_flat_number is not None,
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
    req("GET", "/api/resident/dashboard/",
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

    sub("4.18 Monthly Statements (resident -- published only)")
    _, res_stmts = req("GET", "/api/resident/monthly-statements/",
                        token=_rt, expected=200, label="Resident monthly statements list", phase="Resident")
    res_stmt_id = None
    if res_stmts and isinstance(res_stmts, dict):
        items = res_stmts.get("results") or []
        if items:
            res_stmt_id = items[0].get("id")
            print(f"        {len(items)} published statement(s) found, first id={res_stmt_id}")

    if res_stmt_id:
        _, rs = req("GET", f"/api/resident/monthly-statements/{res_stmt_id}/",
                     token=_rt, expected=200, label="Resident statement detail", phase="Resident")
        if rs:
            d = rs.get("data") or {}
            check(d.get("is_published") is True, "Resident statement is published")

        req_binary("GET", f"/api/resident/monthly-statements/{res_stmt_id}/download-pdf/",
                   token=_rt, expected=200,
                   label="Resident statement download PDF", phase="Resident")

    sub("4.18b Resident statement 404 for unpublished -> 404")
    req("GET", "/api/resident/monthly-statements/999999/",
        token=_rt, expected=404, label="Resident stmt 999999 -> 404", phase="Resident")

    sub("4.19 Auth Guard -- resident on admin endpoint -> 403")
    req("GET", "/api/platform-admin/dashboard/stats/",
        token=_rt, expected=403, label="Resident on super-admin -> 403", phase="Resident")

    sub("4.20 Cross-role -- soc-admin on resident endpoint -> 403")
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
# PHASE 7 -- ACCOUNTANT APIs
# =============================================================================
section("PHASE 7 -- Accountant APIs")

_at = acct_token or soc_token or sa_token
if not _at:
    print("  !! No accountant token - skipping phase 7")
else:

    # ── 7.1  Billing Dashboard ────────────────────────────────────────────────
    sub("7.1  Billing Dashboard")
    _, dash7 = req("GET", "/api/accountant/dashboard/",
                    token=_at, expected=200, label="Accountant billing dashboard", phase="Accountant")
    if dash7 and isinstance(dash7, dict):
        d = dash7.get("data") or {}
        check("collected_this_month" in d, "dashboard has collected_this_month")
        check("outstanding" in d, "dashboard has outstanding")
        check("defaulters" in d, "dashboard has defaulters")
        check("monthly_history" in d, "dashboard has monthly_history (12 rows)")
        if "monthly_history" in d:
            check(len(d["monthly_history"]) == 12, "monthly_history has 12 entries",
                  f"got {len(d['monthly_history'])}")

    # ── 7.2  No-auth guard ────────────────────────────────────────────────────
    req("GET", "/api/accountant/dashboard/",
        expected=401, label="Accountant dashboard no-token -> 401", phase="Accountant")
    if res_token:
        req("GET", "/api/accountant/dashboard/",
            token=res_token, expected=403,
            label="Resident on accountant endpoint -> 403", phase="Accountant")

    # ── 7.3  Payment Collection -- Dues CRUD ──────────────────────────────────
    sub("7.3  Payment Collection -- Dues CRUD")
    _, dues_list = req("GET", "/api/accountant/payment-collection/dues/",
                        token=_at, expected=200, label="List all dues", phase="Accountant")
    if dues_list:
        cnt = dues_list.get("count", dues_list.get("results") and len(dues_list.get("results", [])) or 0)
        print(f"        dues count={cnt}")

    # Filter tests
    req("GET", "/api/accountant/payment-collection/dues/",
        token=_at, params={"status": "pending"},
        expected=200, label="Filter dues by status=pending", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/dues/",
        token=_at, params={"status": "overdue"},
        expected=200, label="Filter dues by status=overdue", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/dues/",
        token=_at, params={"month": "2026-05"},
        expected=200, label="Filter dues by month=2026-05", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/dues/",
        token=_at, params={"month": "bad-month"},
        expected=400, label="Filter dues bad month format -> 400", phase="Accountant")

    # Create a due — accept 201 (fresh) or 400 (unique constraint: already exists from a prior run)
    due_crt_status, new_due = req(
        "POST", "/api/accountant/payment-collection/dues/",
        token=_at,
        json_body={"flat": FLAT_UUID, "month": "2019-06-01",
                   "amount": 3000, "due_date": "2019-06-10",
                   "description": "E2E Test Due"},
        expected=[201, 400], label="Create due manually", phase="Accountant")

    new_due_id = None
    due_is_fresh = (due_crt_status == 201)
    if due_is_fresh and new_due:
        d = new_due.get("data") or new_due
        new_due_id = (d.get("id") if isinstance(d, dict) else None) or data_id(new_due)
    elif due_crt_status == 400:
        # Due already exists from a previous run — locate it via list endpoint
        _, existing = req("GET", "/api/accountant/payment-collection/dues/",
                           token=_at, params={"month": "2019-06"},
                           expected=200, label="Locate existing 2019-06 due", phase="Accountant",
                           show_fail=False)
        if existing:
            for item in (existing.get("results") or []):
                if str(item.get("flat", "")) == str(FLAT_UUID):
                    new_due_id = item.get("id")
                    break

    if new_due_id:
        _, rd = req("GET", f"/api/accountant/payment-collection/dues/{new_due_id}/",
                     token=_at, expected=200, label="Retrieve due", phase="Accountant")
        if rd:
            d = rd.get("data") or {}
            check(str(d.get("amount")) == "3000.00" or float(d.get("amount", 0)) == 3000,
                  "Retrieved due has correct amount")

        if due_is_fresh:
            req("PATCH", f"/api/accountant/payment-collection/dues/{new_due_id}/",
                token=_at, json_body={"description": "Updated E2E due"},
                expected=200, label="Partial update due", phase="Accountant")

            # Mark paid -> creates payment record
            _, mp_resp = req("POST", f"/api/accountant/payment-collection/dues/{new_due_id}/mark-paid/",
                              token=_at,
                              json_body={"payment_method": "upi", "payment_date": "2025-12-15",
                                         "description": "E2E mark paid"},
                              expected=200, label="Mark due as paid", phase="Accountant")
            if mp_resp:
                check(mp_resp.get("success") is True, "mark-paid returns success:true")
                check("payment_id" in mp_resp, "mark-paid returns payment_id")
        else:
            print(" SKIP  Due already paid from prior run — update/mark-paid tests skipped")

        # Cannot edit a paid due (always valid — due was paid this run or a prior one)
        req("PATCH", f"/api/accountant/payment-collection/dues/{new_due_id}/",
            token=_at, json_body={"amount": 9999},
            expected=400, label="Edit paid due -> 400", phase="Accountant")

        # Cannot delete a paid due
        req("DELETE", f"/api/accountant/payment-collection/dues/{new_due_id}/",
            token=_at, expected=400, label="Delete paid due -> 400", phase="Accountant")

    # Due not found
    req("GET", "/api/accountant/payment-collection/dues/999999/",
        token=_at, expected=404, label="Due 999999 -> 404", phase="Accountant")

    # ── 7.4  Payment Collection -- Payments CRUD ──────────────────────────────
    sub("7.4  Payment Collection -- Payments CRUD")
    _, pay_list = req("GET", "/api/accountant/payment-collection/payments/",
                       token=_at, expected=200, label="List payments", phase="Accountant")
    if pay_list:
        print(f"        payments count={pay_list.get('count', '?')}")

    req("GET", "/api/accountant/payment-collection/payments/",
        token=_at, params={"payment_type": "maintenance"},
        expected=200, label="Filter payments by type", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/payments/",
        token=_at, params={"payment_method": "upi"},
        expected=200, label="Filter payments by method", phase="Accountant")

    # Record a manual payment
    _, new_pay = req("POST", "/api/accountant/payment-collection/payments/",
                      token=_at,
                      json_body={"flat": FLAT_UUID, "resident": RES_PROF_ID,
                                 "payment_type": "maintenance", "payment_method": "cash",
                                 "amount": 2000, "payment_date": "2026-05-01",
                                 "description": "E2E manual payment"},
                      expected=201, label="Record manual payment", phase="Accountant")
    manual_pay_id = None
    if new_pay:
        d = new_pay.get("data") or new_pay
        manual_pay_id = d.get("id") if isinstance(d, dict) else None
        check(manual_pay_id is not None, "Record payment returns ID")

    if manual_pay_id:
        req("GET", f"/api/accountant/payment-collection/payments/{manual_pay_id}/",
            token=_at, expected=200, label="Retrieve payment", phase="Accountant")
        req("PATCH", f"/api/accountant/payment-collection/payments/{manual_pay_id}/",
            token=_at, json_body={"description": "Updated note"},
            expected=200, label="Partial update payment", phase="Accountant")
        # Empty update -> 400
        req("PATCH", f"/api/accountant/payment-collection/payments/{manual_pay_id}/",
            token=_at, json_body={"amount": 9999},
            expected=400, label="Update disallowed field -> 400", phase="Accountant")
        req("DELETE", f"/api/accountant/payment-collection/payments/{manual_pay_id}/",
            token=_at, expected=200, label="Delete payment", phase="Accountant")

    req("GET", "/api/accountant/payment-collection/payments/999999/",
        token=_at, expected=404, label="Payment 999999 -> 404", phase="Accountant")

    # ── 7.5  Dues Bulk Generate ───────────────────────────────────────────────
    sub("7.5  Dues -- Bulk Generate (idempotent)")
    _, gen_resp = req("POST", "/api/accountant/payment-collection/dues/generate/",
                       token=_at,
                       json_body={"year": 2025, "month": 11,
                                  "amount": 3500, "due_day": 10,
                                  "description": "E2E bulk generate"},
                       expected=201, label="Bulk generate dues for 2025-11", phase="Accountant")
    if gen_resp:
        check(gen_resp.get("success") is True, "Generate dues returns success:true")
        check("created" in gen_resp, "Generate dues returns created count")
        check("skipped" in gen_resp, "Generate dues returns skipped count")
        print(f"        created={gen_resp.get('created')} skipped={gen_resp.get('skipped')}")

    # Idempotent: generate again for same month -> 0 new, all skipped
    _, gen2 = req("POST", "/api/accountant/payment-collection/dues/generate/",
                   token=_at,
                   json_body={"year": 2025, "month": 11, "amount": 3500},
                   expected=201, label="Idempotent re-generate -> all skipped", phase="Accountant")
    if gen2:
        check(gen2.get("created", 1) == 0, "Re-generate creates 0 new dues (all skipped)",
              f"created={gen2.get('created')}")

    # ── 7.6  Pending Dues ─────────────────────────────────────────────────────
    sub("7.6  Pending Dues")
    _, pd_list = req("GET", "/api/accountant/payment-collection/pending-dues/",
                      token=_at, expected=200, label="Pending dues list + summary", phase="Accountant")
    if pd_list:
        check("summary" in pd_list, "Pending dues response has summary key")
        if "summary" in pd_list:
            s = pd_list["summary"]
            check("defaulters" in s, "Summary has defaulters")
            check("outstanding" in s, "Summary has outstanding")
            check("overdue_60_days" in s, "Summary has overdue_60_days")

    _, pd_sum = req("GET", "/api/accountant/payment-collection/pending-dues/summary/",
                     token=_at, expected=200, label="Pending dues summary only", phase="Accountant")
    if pd_sum:
        d = pd_sum.get("data") or {}
        check("defaulters" in d, "Summary KPI has defaulters")

    req("GET", "/api/accountant/payment-collection/pending-dues/",
        token=_at, params={"status": "overdue"},
        expected=200, label="Pending dues filter by overdue", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/pending-dues/",
        token=_at, params={"search": "A-10"},
        expected=200, label="Pending dues search by flat", phase="Accountant")
    req("GET", "/api/accountant/payment-collection/pending-dues/",
        token=_at, params={"ordering": "-amount"},
        expected=200, label="Pending dues order by -amount", phase="Accountant")

    # Send reminders
    _, rem_resp = req("POST", "/api/accountant/payment-collection/pending-dues/send-reminders/",
                       token=_at, json_body={},
                       expected=200, label="Send reminders (all)", phase="Accountant")
    if rem_resp:
        check(rem_resp.get("success") is True, "Send reminders returns success:true")
        check("recipients" in rem_resp, "Send reminders returns recipients count")

    # ── 7.7  Track Payments ───────────────────────────────────────────────────
    sub("7.7  Track Payments")
    _, tp_list = req("GET", "/api/accountant/track-payments/",
                      token=_at, expected=200, label="Track payments list", phase="Accountant")
    track_pay_id = None
    if tp_list:
        items = tp_list.get("results") or []
        if items:
            track_pay_id = items[0].get("id")
            print(f"        {len(items)} payments, first id={track_pay_id}")

    req("GET", "/api/accountant/track-payments/",
        token=_at, params={"status": "approved"},
        expected=200, label="Track payments filter approved", phase="Accountant")
    req("GET", "/api/accountant/track-payments/",
        token=_at, params={"status": "pending"},
        expected=200, label="Track payments filter pending", phase="Accountant")
    req("GET", "/api/accountant/track-payments/",
        token=_at, params={"payment_method": "upi"},
        expected=200, label="Track payments filter by method=upi", phase="Accountant")
    req("GET", "/api/accountant/track-payments/",
        token=_at, params={"search": "A-101"},
        expected=200, label="Track payments search by flat", phase="Accountant")

    _, tp_summary = req("GET", "/api/accountant/track-payments/summary/",
                         token=_at, expected=200, label="Track payments summary", phase="Accountant")
    if tp_summary:
        d = tp_summary.get("data") or tp_summary
        check(isinstance(d, dict) and len(d) > 0, "Track payments summary returns data dict")

    req_binary("GET", "/api/accountant/track-payments/export/",
               token=_at, expected=200, label="Track payments export CSV", phase="Accountant")

    if track_pay_id:
        req("GET", f"/api/accountant/track-payments/{track_pay_id}/",
            token=_at, expected=200, label="Track payment detail", phase="Accountant")

    req("GET", "/api/accountant/track-payments/999999/",
        token=_at, expected=404, label="Track payment 999999 -> 404", phase="Accountant")

    # ── 7.8  Fund Dashboard ───────────────────────────────────────────────────
    sub("7.8  Fund Dashboard")
    _, fd = req("GET", "/api/accountant/fund-dashboard/",
                 token=_at, expected=200, label="Fund dashboard", phase="Accountant")
    if fd:
        d = fd.get("data") or {}
        kpi = d.get("kpi") or {}
        check("total_collected" in kpi, "Fund dashboard kpi.total_collected")
        check("total_expenses_used" in kpi, "Fund dashboard kpi.total_expenses_used")
        check("remaining_balance" in kpi, "Fund dashboard kpi.remaining_balance")
        check("pending_dues" in kpi, "Fund dashboard kpi.pending_dues")
        check("usage_pct" in kpi, "Fund dashboard kpi.usage_pct")
        check("latest_expenses" in d, "Fund dashboard has latest_expenses list")
        check("monthly_trend" in d, "Fund dashboard has monthly_trend")
        print(f"        collected={kpi.get('total_collected'):.0f}" if kpi.get('total_collected') else "")

    req("GET", "/api/accountant/fund-dashboard/",
        token=_at, params={"months": "6"},
        expected=200, label="Fund dashboard ?months=6", phase="Accountant")

    # ── 7.9  Maintenance Expenses CRUD ────────────────────────────────────────
    sub("7.9  Maintenance Expenses CRUD + Publish")
    _, exp_list = req("GET", "/api/accountant/maintenance-expenses/",
                       token=_at, expected=200, label="List maintenance expenses", phase="Accountant")
    if exp_list:
        print(f"        expenses count={exp_list.get('count', '?')}")

    req("GET", "/api/accountant/maintenance-expenses/",
        token=_at, params={"is_published": "true"},
        expected=200, label="Filter expenses published=true", phase="Accountant")
    req("GET", "/api/accountant/maintenance-expenses/",
        token=_at, params={"category": "repairs"},
        expected=200, label="Filter expenses by category", phase="Accountant")
    req("GET", "/api/accountant/maintenance-expenses/",
        token=_at, params={"search": "pump"},
        expected=200, label="Filter expenses by search=pump", phase="Accountant")

    _, exp_sum = req("GET", "/api/accountant/maintenance-expenses/summary/",
                      token=_at, expected=200, label="Expenses summary", phase="Accountant")
    if exp_sum:
        d = exp_sum.get("data") or {}
        check("total_expenses" in d, "Expenses summary has total_expenses")

    # Create expense (Draft)
    _, new_exp = req("POST", "/api/accountant/maintenance-expenses/",
                      token=_at,
                      json_body={"title": "E2E Water Pump Repair",
                                 "category": "repairs",
                                 "amount": "8500.00",
                                 "vendor_name": "AquaFix",
                                 "payment_mode": "bank_transfer",
                                 "invoice_number": f"INV-E2E-{_RUN}",
                                 "building_area": "Block A Terrace",
                                 "expense_date": "2026-05-10",
                                 "is_published": False,
                                 "notes": "E2E test expense"},
                      expected=201, label="Create expense (draft)", phase="Accountant")
    e2e_exp_id = None
    if new_exp:
        d = new_exp.get("data") or new_exp
        e2e_exp_id = d.get("id") if isinstance(d, dict) else None
        if e2e_exp_id:
            check(d.get("is_published") is False, "New expense is draft (is_published=False)")
            check(d.get("status_display") == "Draft", "status_display == Draft")

    if e2e_exp_id:
        # Retrieve
        req("GET", f"/api/accountant/maintenance-expenses/{e2e_exp_id}/",
            token=_at, expected=200, label="Retrieve expense", phase="Accountant")

        # Update
        req("PATCH", f"/api/accountant/maintenance-expenses/{e2e_exp_id}/",
            token=_at, json_body={"notes": "Updated note", "amount": "9000.00"},
            expected=200, label="Partial update expense", phase="Accountant")

        # Publish
        _, pub_resp = req("POST", f"/api/accountant/maintenance-expenses/{e2e_exp_id}/publish/",
                           token=_at, expected=200, label="Publish expense", phase="Accountant")
        if pub_resp:
            d = pub_resp.get("data") or {}
            check(d.get("is_published") is True, "After publish: is_published=True")
            check(d.get("status_display") == "Published", "After publish: status_display=Published")

        # Unpublish (back to draft)
        _, unpub_resp = req("POST", f"/api/accountant/maintenance-expenses/{e2e_exp_id}/unpublish/",
                             token=_at, expected=200, label="Unpublish expense (to draft)", phase="Accountant")
        if unpub_resp:
            d = unpub_resp.get("data") or {}
            check(d.get("is_published") is False, "After unpublish: is_published=False")

        # Delete
        _, del_exp = req("DELETE", f"/api/accountant/maintenance-expenses/{e2e_exp_id}/",
                          token=_at, expected=200, label="Delete expense", phase="Accountant")
        if del_exp:
            check(del_exp.get("success") is True, "Delete expense returns success:true")

    req("GET", "/api/accountant/maintenance-expenses/999999/",
        token=_at, expected=404, label="Expense 999999 -> 404", phase="Accountant")

    # ── 7.10 Monthly Statements ───────────────────────────────────────────────
    sub("7.10 Monthly Statements")
    _, stmt_list = req("GET", "/api/accountant/monthly-statements/",
                        token=_at, expected=200, label="List statements", phase="Accountant")
    stmt_id = None
    if stmt_list:
        items = stmt_list.get("results") or []
        print(f"        {len(items)} statement(s)")
        if items:
            stmt_id = items[0].get("id")

    req("GET", "/api/accountant/monthly-statements/",
        token=_at, params={"is_published": "true"},
        expected=200, label="Filter statements published=true", phase="Accountant")
    req("GET", "/api/accountant/monthly-statements/",
        token=_at, params={"year": "2026"},
        expected=200, label="Filter statements year=2026", phase="Accountant")

    # Generate statement — accept 201 (new) or 200 (re-generate from prior run).
    # If already published from a prior run, unpublish it first to restore draft state.
    _, gen_stmt = req("POST", "/api/accountant/monthly-statements/generate/",
                       token=_at,
                       json_body={"year": 2026, "month": 3,
                                  "opening_balance": 5000,
                                  "notes": "E2E generated statement"},
                       expected=[200, 201], label="Generate statement for 2026-03", phase="Accountant")
    gen_stmt_id = None
    if gen_stmt:
        d = gen_stmt.get("data") or gen_stmt
        gen_stmt_id = d.get("id") if isinstance(d, dict) else None
        if gen_stmt_id:
            # If a prior run left it published, restore to draft so publish/unpublish tests work
            if d.get("is_published"):
                req("POST", f"/api/accountant/monthly-statements/{gen_stmt_id}/unpublish/",
                    token=_at, expected=200,
                    label="Reset statement to draft (prior-run cleanup)", phase="Accountant",
                    show_fail=False)
            # Verify draft state via fresh GET
            _, chk = req("GET", f"/api/accountant/monthly-statements/{gen_stmt_id}/",
                          token=_at, expected=200,
                          label="Verify statement draft state", phase="Accountant", show_fail=False)
            if chk:
                check((chk.get("data") or chk).get("is_published") is False,
                      "Generated statement is draft by default")
            stmt_id = gen_stmt_id  # use for further tests

    if stmt_id:
        _, rs = req("GET", f"/api/accountant/monthly-statements/{stmt_id}/",
                     token=_at, expected=200, label="Statement detail", phase="Accountant")
        if rs:
            d = rs.get("data") or {}
            check("month" in d, "Statement detail has month field")
            check("income" in d or "total_income" in d or "summary" in d,
                  "Statement detail has income/summary data")

        # Publish
        _, pub_stmt = req("POST", f"/api/accountant/monthly-statements/{stmt_id}/publish/",
                           token=_at, expected=200, label="Publish statement", phase="Accountant")
        if pub_stmt:
            d = pub_stmt.get("data") or {}
            check(d.get("is_published") is True, "After publish: statement is_published=True")

        # Unpublish
        req("POST", f"/api/accountant/monthly-statements/{stmt_id}/unpublish/",
            token=_at, expected=200, label="Unpublish statement", phase="Accountant")

        # Download PDF
        req_binary("GET", f"/api/accountant/monthly-statements/{stmt_id}/download-pdf/",
                   token=_at, expected=200,
                   label="Statement download PDF", phase="Accountant")

        # Export Excel
        req_binary("GET", f"/api/accountant/monthly-statements/{stmt_id}/export-excel/",
                   token=_at, expected=200,
                   label="Statement export Excel", phase="Accountant")

    req("GET", "/api/accountant/monthly-statements/999999/",
        token=_at, expected=404, label="Statement 999999 -> 404", phase="Accountant")

    # ── 7.11 Generate Receipts ────────────────────────────────────────────────
    sub("7.11 Generate Receipts")
    _, rcpt_list = req("GET", "/api/accountant/generate-receipts/",
                        token=_at, expected=200, label="Receipts list", phase="Accountant")
    rcpt_id = None
    if rcpt_list:
        items = rcpt_list.get("results") or []
        print(f"        {len(items)} receipt(s)")
        if items:
            rcpt_id = items[0].get("id")

    req("GET", "/api/accountant/generate-receipts/",
        token=_at, params={"payment_type": "maintenance"},
        expected=200, label="Receipts filter by payment_type", phase="Accountant")
    req("GET", "/api/accountant/generate-receipts/",
        token=_at, params={"month": "2026-05"},
        expected=200, label="Receipts filter by month=2026-05", phase="Accountant")
    req("GET", "/api/accountant/generate-receipts/",
        token=_at, params={"search": "Aarav"},
        expected=200, label="Receipts search by resident name", phase="Accountant")

    if rcpt_id:
        _, rd = req("GET", f"/api/accountant/generate-receipts/{rcpt_id}/",
                     token=_at, expected=200, label="Receipt JSON detail", phase="Accountant")
        if rd:
            d = rd.get("data") or {}
            check("receipt_number" in d, "Receipt detail has receipt_number")
            check("amount" in d, "Receipt detail has amount")
            check("resident_name" in d, "Receipt detail has resident_name")

        req_binary("GET", f"/api/accountant/generate-receipts/{rcpt_id}/pdf/",
                   token=_at, expected=200,
                   label="Single receipt PDF download", phase="Accountant")

    req_binary("GET", "/api/accountant/generate-receipts/bulk-pdf/",
               token=_at, expected=200,
               label="Bulk PDF all receipts", phase="Accountant")

    req_binary("GET", "/api/accountant/generate-receipts/bulk-csv/",
               token=_at, expected=200,
               label="Bulk CSV all receipts", phase="Accountant")

    req("GET", "/api/accountant/generate-receipts/999999/",
        token=_at, expected=404, label="Receipt 999999 -> 404", phase="Accountant")

    # ── 7.12 Payment Reports ──────────────────────────────────────────────────
    sub("7.12 Payment Reports")
    _, rpt = req("GET", "/api/accountant/payment-reports/",
                  token=_at, expected=200, label="Payment analytics report (JSON)", phase="Accountant")
    if rpt:
        d = rpt.get("data") or {}
        check("total_payments" in d, "Report has total_payments")
        check("total_amount" in d, "Report has total_amount")
        check("by_method" in d, "Report has by_method breakdown")
        check("by_type" in d, "Report has by_type breakdown")
        check("monthly_trend" in d, "Report has monthly_trend")
        print(f"        total_payments={d.get('total_payments')} total_amount={d.get('total_amount')}")

    req("GET", "/api/accountant/payment-reports/",
        token=_at, params={"months": "6"},
        expected=200, label="Payment report ?months=6", phase="Accountant")
    req("GET", "/api/accountant/payment-reports/",
        token=_at, params={"year": "2026"},
        expected=200, label="Payment report ?year=2026", phase="Accountant")
    req("GET", "/api/accountant/payment-reports/",
        token=_at, params={"payment_type": "maintenance"},
        expected=200, label="Payment report filter by type=maintenance", phase="Accountant")
    req("GET", "/api/accountant/payment-reports/",
        token=_at, params={"payment_method": "upi"},
        expected=200, label="Payment report filter by method=upi", phase="Accountant")

    req_binary("GET", "/api/accountant/payment-reports/download-pdf/",
               token=_at, expected=200,
               label="Payment analytics report PDF download", phase="Accountant")

    # ── 7.13 Export Reports -- CSV ────────────────────────────────────────────
    sub("7.13 Export Reports -- CSV")
    req_binary("GET", "/api/accountant/export-reports/payments/",
               token=_at, expected=200, label="Export payments CSV", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/payments/",
               token=_at, params={"month": "2026-05"},
               expected=200, label="Export payments CSV filtered by month", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/dues/",
               token=_at, expected=200, label="Export dues CSV", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/dues/",
               token=_at, params={"status": "pending"},
               expected=200, label="Export dues CSV filtered by status=pending", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/expenses/",
               token=_at, expected=200, label="Export expenses CSV", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/expenses/",
               token=_at, params={"is_published": "true"},
               expected=200, label="Export published expenses CSV", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/statements/",
               token=_at, expected=200, label="Export statements CSV", phase="Accountant")

    # ── 7.14 Export Reports -- PDF ────────────────────────────────────────────
    sub("7.14 Export Reports -- PDF")
    req_binary("GET", "/api/accountant/export-reports/payments/pdf/",
               token=_at, expected=200, label="Export payments PDF", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/dues/pdf/",
               token=_at, expected=200, label="Export dues PDF", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/expenses/pdf/",
               token=_at, expected=200, label="Export expenses PDF", phase="Accountant")
    req_binary("GET", "/api/accountant/export-reports/statements/pdf/",
               token=_at, expected=200, label="Export statements PDF", phase="Accountant")

    # ── 7.15 Export Reports -- Tally XML ─────────────────────────────────────
    sub("7.15 Export Reports -- Tally XML")
    xml_code, xml_body = req_binary("GET", "/api/accountant/export-reports/payments/tally/",
                                    token=_at, expected=200,
                                    label="Export payments Tally XML", phase="Accountant")
    if xml_body and xml_code == 200:
        check(xml_body[:5] == b"<?xml", "Tally XML starts with <?xml",
              xml_body[:30].decode("utf-8", errors="replace"))

    req_binary("GET", "/api/accountant/export-reports/payments/tally/",
               token=_at, params={"month": "2026-05"},
               expected=200, label="Tally XML filtered by month", phase="Accountant")


# =============================================================================
# PHASE 8 -- SECURITY GUARD APIs
# =============================================================================
section("PHASE 8 -- Security Guard APIs")

GUARD_MOBILE = "9000000004"   # update if guard was seeded with a different mobile

# ── 8.0  Guard login (fall back to society-admin token) ──────────────────────
sub("8.0  Guard login")
guard_token = None
_, g_body = req("POST", "/api/accounts/login/mobile/",
                json_body={"mobile": GUARD_MOBILE, "otp_code": OTP},
                expected=200, label="Guard OTP login", phase="SecurityGuard",
                show_fail=False)
if g_body:
    guard_token, _ = tokens_from(g_body)
if not guard_token:
    guard_token = soc_token or sa_token
    print("        [INFO] Guard login not found — using society-admin token as fallback")
else:
    check(guard_token is not None, "Guard login returned access token")

_sg = guard_token
if not _sg:
    print("  !! No usable guard token — skipping Phase 8")
else:
    # ── 8.1  Guard Dashboard ─────────────────────────────────────────────────
    sub("8.1  Guard Dashboard")
    _, dash = req("GET", "/api/security-guard/dashboard/",
                  token=_sg, expected=200, label="Guard dashboard", phase="SecurityGuard")
    if dash and isinstance(dash, dict):
        d = dash.get("data") or {}
        for key in ("in_today", "out_today", "at_gate", "active_alerts"):
            check(key in d, f"Dashboard has {key}")

    # ── 8.2  Gate Entry ──────────────────────────────────────────────────────
    sub("8.2  Gate Entry")
    _, gel = req("GET", "/api/security-guard/gate-entry/",
                 token=_sg, expected=200, label="Gate entry list", phase="SecurityGuard")
    check(isinstance(gel, dict), "Gate entry list is paginated dict", str(type(gel)))

    _, ge_sum = req("GET", "/api/security-guard/gate-entry/summary/",
                    token=_sg, expected=200, label="Gate entry summary", phase="SecurityGuard")
    if ge_sum:
        d = ge_sum.get("data") or ge_sum
        # Various key names depending on implementation
        check(
            "today_entries" in d or "currently_inside" in d
            or "in_today" in d or "total" in d or "success" in ge_sum,
            "Entry summary has KPI fields", str(list(d.keys())[:6])
        )

    gate_entry_id = None
    _, ge_new = req("POST", "/api/security-guard/gate-entry/",
                    token=_sg, expected=[201, 400],
                    json_body={
                        "visitor_name": f"Test Visitor {_RUN}",
                        "mobile":       f"98{_RUN}0001",
                        "entry_type":   "visitor",
                        "direction":    "in",
                        "flat_number":  FLAT_NUMBER,
                        "purpose":      "personal",
                    },
                    label="Gate entry create", phase="SecurityGuard")
    if ge_new and isinstance(ge_new, dict):
        gate_entry_id = ge_new.get("id") or (ge_new.get("data") or {}).get("id")

    if gate_entry_id:
        req("GET", f"/api/security-guard/gate-entry/{gate_entry_id}/",
            token=_sg, expected=200, label="Gate entry detail", phase="SecurityGuard")

    # ── 8.3  Entry/Exit Log ──────────────────────────────────────────────────
    sub("8.3  Entry/Exit Log")
    _, log = req("GET", "/api/security-guard/gate-entry/log/",
                 token=_sg, expected=200, label="Entry/Exit log today", phase="SecurityGuard")
    if log and isinstance(log, dict):
        check("log_date" in log, "Log has log_date")
        check("stats" in log, "Log has stats block")
        stats = log.get("stats") or {}
        for k in ("total", "inside", "exited"):
            check(k in stats, f"Log stats has {k}")

    req("GET", "/api/security-guard/gate-entry/log/",
        token=_sg, params={"date": "2026-05-25"},
        expected=200, label="Entry/Exit log ?date=2026-05-25", phase="SecurityGuard")

    req_binary("GET", "/api/security-guard/gate-entry/log/export/",
               token=_sg, expected=200,
               label="Entry/Exit log CSV export", phase="SecurityGuard")

    # ── 8.4  Visitor Log ─────────────────────────────────────────────────────
    sub("8.4  Visitor Log")
    _, vlog = req("GET", "/api/security-guard/visitor-log/",
                  token=_sg, expected=200, label="Visitor log list", phase="SecurityGuard")
    visitor_id = None
    if vlog:
        first = first_result(vlog)
        if first:
            visitor_id = first.get("id")
            print(f"        first visitor: id={visitor_id} status={first.get('status')}")

    if visitor_id:
        first_v = first_result(vlog) or {}
        st = first_v.get("status", "")
        if st == "pending":
            req("POST", f"/api/security-guard/visitor-log/{visitor_id}/approve/",
                token=_sg, expected=[200, 400],
                label="Visitor approve", phase="SecurityGuard")
        if st in ("pending", "approved"):
            req("POST", f"/api/security-guard/visitor-log/{visitor_id}/check-in/",
                token=_sg, expected=[200, 400],
                label="Visitor check-in", phase="SecurityGuard")

    req("GET", "/api/security-guard/visitor-log/",
        token=_sg, params={"status": "pending"},
        expected=200, label="Visitor log filter status=pending", phase="SecurityGuard")
    req("GET", "/api/security-guard/visitor-log/",
        token=_sg, params={"visit_type": "visitor"},
        expected=200, label="Visitor log filter visit_type=visitor", phase="SecurityGuard")

    # ── 8.5  Vehicle Tracking ────────────────────────────────────────────────
    sub("8.5  Vehicle Tracking")
    req("GET", "/api/security-guard/vehicle-tracking/",
        token=_sg, expected=200, label="Vehicle tracking list", phase="SecurityGuard")

    _, vt_sum = req("GET", "/api/security-guard/vehicle-tracking/summary/",
                    token=_sg, expected=200, label="Vehicle summary", phase="SecurityGuard")
    if vt_sum:
        d = vt_sum.get("data") or vt_sum
        check(
            "vehicles_in_today" in d or "currently_inside" in d
            or "total" in d or "in_today" in d or "success" in vt_sum,
            "Vehicle summary has KPI fields", str(list(d.keys())[:6])
        )

    vehicle_id = None
    _, vt_new = req("POST", "/api/security-guard/vehicle-tracking/",
                    token=_sg, expected=[201, 400],
                    json_body={
                        "vehicle_number": f"MH12{_RUN}",
                        "vehicle_type":   "car",
                        "direction":      "in",
                        "flat":           FLAT_UUID,
                    },
                    label="Log vehicle IN", phase="SecurityGuard")
    if vt_new and isinstance(vt_new, dict):
        vehicle_id = vt_new.get("id") or (vt_new.get("data") or {}).get("id")

    if vehicle_id:
        req("GET", f"/api/security-guard/vehicle-tracking/{vehicle_id}/",
            token=_sg, expected=200, label="Vehicle detail", phase="SecurityGuard")

    # ── 8.6  Emergency Alerts ────────────────────────────────────────────────
    sub("8.6  Emergency Alerts")
    _, alerts_list = req("GET", "/api/security-guard/emergency-alerts/",
                         token=_sg, expected=200, label="Alerts list", phase="SecurityGuard")

    _, al_stats = req("GET", "/api/security-guard/emergency-alerts/stats/",
                      token=_sg, expected=200, label="Alert stats", phase="SecurityGuard")
    if al_stats:
        d = al_stats.get("data") or {}
        for k in ("active", "acknowledged", "total"):
            check(k in d, f"Alert stats has {k}")

    alert_id = None
    _, al_new = req("POST", "/api/security-guard/emergency-alerts/",
                    token=_sg, expected=[201, 400],
                    json_body={
                        "alert_type":  "intruder",
                        "description": f"Test alert {_RUN}",
                        "location":    "Main Gate",
                    },
                    label="Create emergency alert", phase="SecurityGuard")
    if al_new and isinstance(al_new, dict):
        alert_id = al_new.get("id") or (al_new.get("data") or {}).get("id")

    if alert_id:
        req("GET", f"/api/security-guard/emergency-alerts/{alert_id}/",
            token=_sg, expected=200, label="Alert detail", phase="SecurityGuard")
        _, ack = req("POST", f"/api/security-guard/emergency-alerts/{alert_id}/acknowledge/",
                     token=_sg, expected=[200, 400],
                     label="Acknowledge alert", phase="SecurityGuard")
        if ack and isinstance(ack, dict):
            check(ack.get("success") or ack.get("status") == "acknowledged",
                  "Acknowledge returns success or acknowledged status")
        req("POST", f"/api/security-guard/emergency-alerts/{alert_id}/resolve/",
            token=_sg, json_body={"notes": "Test resolved"},
            expected=[200, 400],
            label="Resolve alert", phase="SecurityGuard")

    req("GET", "/api/security-guard/emergency-alerts/",
        token=_sg, params={"status": "active"},
        expected=200, label="Alerts filter status=active", phase="SecurityGuard")

    # ── 8.7  Shift Management ────────────────────────────────────────────────
    sub("8.7  Shift Management")
    req("GET", "/api/security-guard/shift-management/",
        token=_sg, expected=200, label="Shift list", phase="SecurityGuard")
    _, today_shift = req("GET", "/api/security-guard/shift-management/today/",
                         token=_sg, expected=200, label="Today's shift", phase="SecurityGuard")
    if today_shift and isinstance(today_shift, dict):
        check("success" in today_shift, "Today shift response has success key")

    # ── 8.8  Visitor Entry (Register at Gate) ────────────────────────────────
    sub("8.8  Visitor Entry")
    new_vis_id = None
    _, ve_new = req("POST", "/api/security-guard/visitor-entry/",
                    token=_sg, expected=[201, 400],
                    json_body={
                        "flat":       FLAT_UUID,
                        "full_name":  f"Gate Visitor {_RUN}",
                        "mobile":     f"97{_RUN}0002",
                        "visit_type": "guest",
                        "purpose":    "personal",
                    },
                    label="Register visitor at gate", phase="SecurityGuard")
    if ve_new and isinstance(ve_new, dict):
        new_vis_id = ve_new.get("id") or (ve_new.get("data") or {}).get("id")
        print(f"        registered visitor id={new_vis_id}")

    req("GET", "/api/security-guard/visitor-entry/search/",
        token=_sg, params={"mobile": RES_MOBILE},
        expected=200, label="Search visitor by mobile", phase="SecurityGuard")
    req("GET", "/api/security-guard/visitor-entry/search/",
        token=_sg, params={"name": "Aarav"},
        expected=200, label="Search visitor by name", phase="SecurityGuard")

    # ── 8.9  QR / Passcode Verification ─────────────────────────────────────
    sub("8.9  QR / Passcode Verification")
    _, qr_verify = req("POST", "/api/security-guard/qr-passcode/verify/",
                       token=_sg, json_body={"code": "MG-PASS-XXXX"},
                       expected=[200, 400, 404],
                       label="Verify QR passcode (non-existent)", phase="SecurityGuard")
    if qr_verify and isinstance(qr_verify, dict):
        check("valid" in qr_verify or "success" in qr_verify,
              "Verify response has valid or success key")

    req("POST", "/api/security-guard/qr-passcode/checkin/",
        token=_sg, json_body={"code": "MG-PASS-XXXX"},
        expected=[200, 400, 404],
        label="Check-in via QR (non-existent pass)", phase="SecurityGuard")

    # ── 8.10  Delivery Verification ──────────────────────────────────────────
    sub("8.10  Delivery Verify")
    req("GET", "/api/security-guard/delivery-verify/",
        token=_sg, expected=200, label="Delivery list", phase="SecurityGuard")
    req("GET", "/api/security-guard/delivery-verify/pending/",
        token=_sg, expected=200, label="Pending deliveries", phase="SecurityGuard")
    req("GET", "/api/security-guard/delivery-verify/at-gate/",
        token=_sg, expected=200, label="Deliveries at gate", phase="SecurityGuard")

    _, dv_sum = req("GET", "/api/security-guard/delivery-verify/summary/",
                    token=_sg, expected=200, label="Delivery summary", phase="SecurityGuard")
    if dv_sum:
        d = dv_sum.get("data") or {}
        check("total_today" in d or "pending" in d, "Delivery summary has KPI fields")

    delivery_id = None
    _, dv_new = req("POST", "/api/security-guard/delivery-verify/",
                    token=_sg, expected=[201, 400],
                    json_body={
                        "flat":            FLAT_UUID,
                        "delivery_type":   "courier",
                        "vendor":          "dtdc",
                        "agent_name":      f"DTDC Agent {_RUN}",
                        "agent_mobile":    f"96{_RUN}0003",
                        "flat_number_raw": FLAT_NUMBER,
                        "recipient_name":  "Aarav Sharma",
                    },
                    label="Create delivery entry", phase="SecurityGuard")
    if dv_new and isinstance(dv_new, dict):
        delivery_id = dv_new.get("id") or (dv_new.get("data") or {}).get("id")
        print(f"        created delivery id={delivery_id}")

    if delivery_id:
        req("GET", f"/api/security-guard/delivery-verify/{delivery_id}/",
            token=_sg, expected=200, label="Delivery detail", phase="SecurityGuard")
        req("POST", f"/api/security-guard/delivery-verify/{delivery_id}/approve/",
            token=_sg, expected=[200, 400],
            label="Approve delivery (sends OTP)", phase="SecurityGuard")
        req("POST", f"/api/security-guard/delivery-verify/{delivery_id}/generate-otp/",
            token=_sg, expected=[200, 400],
            label="Generate/resend OTP", phase="SecurityGuard")
        _, dv_otp = req("POST", f"/api/security-guard/delivery-verify/{delivery_id}/verify-otp/",
                        token=_sg, json_body={"otp_code": OTP},
                        expected=[200, 400],
                        label="Verify OTP=123456", phase="SecurityGuard")
        if dv_otp and isinstance(dv_otp, dict):
            print(f"        OTP verify: success={dv_otp.get('success')} "
                  f"msg={str(dv_otp.get('message', ''))[:50]}")

    req("GET", "/api/security-guard/delivery-verify/",
        token=_sg, params={"status": "pending"},
        expected=200, label="Delivery filter status=pending", phase="SecurityGuard")

    # ── 8.11  Approved Visitors ──────────────────────────────────────────────
    sub("8.11  Approved Visitors")
    _, av_list = req("GET", "/api/security-guard/approved-visitors/",
                     token=_sg, expected=200, label="Approved visitors list", phase="SecurityGuard")
    if av_list:
        items = av_list.get("results") or []
        print(f"        {len(items)} approved visitors found")
        if items:
            first = items[0]
            check("visitor_name" in first, "Approved visitor has visitor_name")
            check("source" in first, "Approved visitor has source (guest_pass|visitor)")
            check("flat_display" in first, "Approved visitor has flat_display")

    req("GET", "/api/security-guard/approved-visitors/",
        token=_sg, params={"visit_type": "visitor"},
        expected=200, label="Approved visitors filter visit_type=visitor", phase="SecurityGuard")

    req_binary("GET", "/api/security-guard/approved-visitors/export/",
               token=_sg, expected=200,
               label="Approved visitors CSV export", phase="SecurityGuard")

    # ── 8.12  Contact Resident ───────────────────────────────────────────────
    sub("8.12  Contact Resident")
    _, cr_list = req("GET", "/api/security-guard/contact-resident/",
                     token=_sg, expected=200, label="Contact resident list", phase="SecurityGuard")
    if cr_list:
        items = cr_list.get("results") or []
        print(f"        {len(items)} flat(s) with residents")
        if items:
            first = items[0]
            check("flat_display" in first, "Contact item has flat_display")
            check("residents" in first, "Contact item has residents list")

    req("GET", "/api/security-guard/contact-resident/",
        token=_sg, params={"search": "Aarav"},
        expected=200, label="Contact resident search=Aarav", phase="SecurityGuard")

    _, cr_flat = req("GET", f"/api/security-guard/contact-resident/{FLAT_UUID}/",
                     token=_sg, expected=[200, 404],
                     label=f"Contact flat detail (A-101 UUID)", phase="SecurityGuard")
    if cr_flat and isinstance(cr_flat, dict):
        d = cr_flat.get("data") or cr_flat
        check("residents" in d or "flat_display" in d,
              "Flat contact detail has residents or flat_display")

    # ── 8.13  Cross-role: resident cannot reach guard endpoints ──────────────
    sub("8.13  Resident cannot access guard APIs")
    if res_token:
        req("GET", "/api/security-guard/dashboard/",
            token=res_token, expected=403,
            label="Resident on guard dashboard -> 403", phase="SecurityGuard")
        req("GET", "/api/security-guard/emergency-alerts/",
            token=res_token, expected=403,
            label="Resident on emergency-alerts -> 403", phase="SecurityGuard")
        req("GET", "/api/security-guard/contact-resident/",
            token=res_token, expected=403,
            label="Resident on contact-resident -> 403", phase="SecurityGuard")


# =============================================================================
# PHASE 9 -- CROSS-ROLE ACCESS VALIDATION
# =============================================================================
section("PHASE 9 -- Cross-Role Access Validation")

sub("9.1  Resident cannot access accountant APIs")
if res_token:
    req("GET", "/api/accountant/dashboard/",
        token=res_token, expected=403,
        label="Resident on accountant dashboard -> 403", phase="CrossRole")
    req("GET", "/api/accountant/payment-collection/dues/",
        token=res_token, expected=403,
        label="Resident on dues list -> 403", phase="CrossRole")
    req("GET", "/api/accountant/payment-reports/",
        token=res_token, expected=403,
        label="Resident on payment-reports -> 403", phase="CrossRole")

sub("9.2  Resident can only see published monthly statements")
if res_token and stmt_id:
    # Make sure statement is published before resident tries to access
    req("POST", f"/api/accountant/monthly-statements/{stmt_id}/publish/",
        token=_at, expected=200, label="Ensure statement is published for resident test",
        phase="CrossRole")
    _, r_stmt = req("GET", f"/api/resident/monthly-statements/{stmt_id}/",
                     token=res_token, expected=200,
                     label="Resident can read published statement", phase="CrossRole")
    if r_stmt:
        check(r_stmt.get("data", {}).get("is_published") is True,
              "Resident sees only published statements")

sub("9.3  Accountant cannot access super-admin APIs")
if acct_token and acct_token != sa_token:
    req("GET", "/api/platform-admin/dashboard/stats/",
        token=acct_token, expected=403,
        label="Accountant on super-admin dashboard -> 403", phase="CrossRole")

sub("9.4  No token on all key endpoints -> 401")
for path in [
    "/api/accountant/dashboard/",
    "/api/accountant/fund-dashboard/",
    "/api/accountant/payment-reports/",
    "/api/resident/monthly-statements/",
    "/api/society-admin/dashboard/",
    "/api/platform-admin/dashboard/stats/",
]:
    req("GET", path, expected=401, label=f"No-auth {path} -> 401", phase="CrossRole")


# =============================================================================
# PHASE 10 -- MAINTENANCE STAFF APIs
# =============================================================================
section("PHASE 10 -- Maintenance Staff APIs")

MAINT_MOBILE = "9000000005"   # Raju Sharma, maintenance-staff, society 11

sub("10.0  Maintenance Staff login")
maint_token = None
_, m_body = req("POST", "/api/accounts/login/mobile/",
                json_body={"mobile": MAINT_MOBILE, "otp_code": OTP},
                expected=200, label="Maintenance staff OTP login", phase="MaintenanceStaff",
                show_fail=False)
if m_body:
    maint_token, _ = tokens_from(m_body)
if not maint_token:
    maint_token = soc_token or sa_token
    print("        [INFO] Maintenance login failed — using society-admin token as fallback")
else:
    check(maint_token is not None, "Maintenance staff login returned access token")
    if m_body:
        d = m_body.get("data", {})
        check(d.get("role", {}).get("slug") == "maintenance-staff",
              "Login role.slug == maintenance-staff")
        check(m_body.get("home_route") == "maintenance_staff_dashboard",
              "Login home_route == maintenance_staff_dashboard",
              str(m_body.get("home_route")))

_ms = maint_token
if not _ms:
    print("  !! No maintenance staff token — skipping Phase 10")
else:
    sub("10.1  Dashboard")
    _, md = req("GET", "/api/maintenance-staff/dashboard/",
                token=_ms, expected=200, label="Maintenance dashboard", phase="MaintenanceStaff")
    if md and isinstance(md, dict):
        d = md.get("data") or {}
        check("stats" in d, "Dashboard has stats")
        check("my_task_queue" in d, "Dashboard has my_task_queue")
        check("recently_completed" in d, "Dashboard has recently_completed")
        s = d.get("stats") or {}
        for k in ("open", "in_progress", "done_this_week"):
            check(k in s, f"Dashboard stats has {k}")

    sub("10.2  Auth guards")
    req("GET", "/api/maintenance-staff/dashboard/",
        expected=401, label="No token -> 401", phase="MaintenanceStaff")
    if res_token:
        req("GET", "/api/maintenance-staff/dashboard/",
            token=res_token, expected=403,
            label="Resident on maintenance dashboard -> 403", phase="MaintenanceStaff")

    sub("10.3  Assigned Tasks -- list")
    _, task_list = req("GET", "/api/maintenance-staff/assigned-tasks/",
                       token=_ms, expected=200,
                       label="List tasks", phase="MaintenanceStaff")
    if task_list:
        cnt = task_list.get("count", len(task_list.get("results", [])))
        print(f"        tasks count={cnt}")

    req("GET", "/api/maintenance-staff/assigned-tasks/",
        token=_ms, params={"status": "open"},
        expected=200, label="Filter tasks status=open", phase="MaintenanceStaff")
    req("GET", "/api/maintenance-staff/assigned-tasks/",
        token=_ms, params={"priority": "high"},
        expected=200, label="Filter tasks priority=high", phase="MaintenanceStaff")
    req("GET", "/api/maintenance-staff/assigned-tasks/",
        token=_ms, params={"search": "pump"},
        expected=200, label="Search tasks", phase="MaintenanceStaff")

    sub("10.4  Create + CRUD a task (society-admin or maintenance-staff can create)")
    # Use soc_token so the task gets assigned to our maintenance staff user
    maint_profile_id = None
    try:
        from apps.roles_permissions.models import UserProfile
        mp = UserProfile.objects.get(mobile=MAINT_MOBILE)
        maint_profile_id = mp.pk
    except Exception:
        pass

    _ct = soc_token or sa_token
    new_task_id = None
    if _ct:
        _, new_task = req("POST", "/api/maintenance-staff/assigned-tasks/",
                          token=_ct,
                          json_body={
                              "title": f"E2E Pump Repair {_RUN}",
                              "category": "plumbing",
                              "priority": "high",
                              "location": "Block A Terrace",
                              "description": "Water pump making noise",
                              **({"assignee": maint_profile_id} if maint_profile_id else {}),
                          },
                          expected=201, label="Create task", phase="MaintenanceStaff")
        if new_task:
            d = new_task.get("data") or new_task
            new_task_id = d.get("id") if isinstance(d, dict) else None
            if new_task_id:
                check(d.get("status") == "open", "New task status==open",
                      str(d.get("status")))
                check("task_id" in d, "Task has task_id field (TSK-XXXX)")

    if new_task_id:
        req("GET", f"/api/maintenance-staff/assigned-tasks/{new_task_id}/",
            token=_ms, expected=200, label="Retrieve task", phase="MaintenanceStaff")

        _, start_r = req("PATCH", f"/api/maintenance-staff/assigned-tasks/{new_task_id}/start/",
                         token=_ms, expected=200,
                         label="Start task (OPEN -> IN_PROGRESS)", phase="MaintenanceStaff")
        if start_r:
            d = (start_r.get("data") or start_r)
            check(d.get("status") == "in_progress", "After start: status==in_progress",
                  str(d.get("status")))

        _, complete_r = req("PATCH", f"/api/maintenance-staff/assigned-tasks/{new_task_id}/complete/",
                            token=_ms,
                            json_body={"resolution_notes": "Pump replaced successfully", "hours_logged": 2},
                            expected=200,
                            label="Complete task (IN_PROGRESS -> DONE)", phase="MaintenanceStaff")
        if complete_r:
            d = (complete_r.get("data") or complete_r)
            check(d.get("status") == "done", "After complete: status==done",
                  str(d.get("status")))
            check(d.get("resolution_notes") == "Pump replaced successfully",
                  "resolution_notes saved")

        req("PATCH", f"/api/maintenance-staff/assigned-tasks/{new_task_id}/complete/",
            token=_ms, expected=400,
            label="Complete already-done task -> 400", phase="MaintenanceStaff")

    req("GET", "/api/maintenance-staff/assigned-tasks/999999/",
        token=_ms, expected=404, label="Task 999999 -> 404", phase="MaintenanceStaff")

    sub("10.5  Work History")
    req("GET", "/api/maintenance-staff/work-history/",
        token=_ms, expected=200, label="Work history list", phase="MaintenanceStaff")

    sub("10.6  Materials Request")
    req("GET", "/api/maintenance-staff/materials-request/",
        token=_ms, expected=200, label="Materials request list", phase="MaintenanceStaff")

    sub("10.7  Schedule")
    req("GET", "/api/maintenance-staff/schedule/",
        token=_ms, expected=200, label="Schedule list", phase="MaintenanceStaff")


# =============================================================================
# PHASE 11 -- SUPPORT STAFF APIs
# =============================================================================
section("PHASE 11 -- Support Staff APIs")

SUPPORT_MOBILE = "9000000006"  # Priya Nair, support-staff, society 11

sub("11.0  Support Staff login")
support_token = None
_, sp_body = req("POST", "/api/accounts/login/mobile/",
                 json_body={"mobile": SUPPORT_MOBILE, "otp_code": OTP},
                 expected=200, label="Support staff OTP login", phase="SupportStaff",
                 show_fail=False)
if sp_body:
    support_token, _ = tokens_from(sp_body)
if not support_token:
    support_token = soc_token or sa_token
    print("        [INFO] Support login failed — using society-admin token as fallback")
else:
    check(support_token is not None, "Support staff login returned access token")
    if sp_body:
        d = sp_body.get("data", {})
        check(d.get("role", {}).get("slug") == "support-staff",
              "Login role.slug == support-staff")
        check(sp_body.get("home_route") == "support_staff_dashboard",
              "Login home_route == support_staff_dashboard",
              str(sp_body.get("home_route")))

_ss = support_token
if not _ss:
    print("  !! No support staff token — skipping Phase 11")
else:
    sub("11.1  Dashboard")
    _, spd = req("GET", "/api/support-staff/dashboard/",
                 token=_ss, expected=200, label="Support dashboard", phase="SupportStaff")
    if spd and isinstance(spd, dict):
        d = spd.get("data") or {}
        check("stats" in d, "Dashboard has stats")
        check("active_tickets" in d, "Dashboard has active_tickets")
        check("recently_resolved" in d, "Dashboard has recently_resolved")
        s = d.get("stats") or {}
        for k in ("open", "in_progress", "resolved_this_week"):
            check(k in s, f"Dashboard stats has {k}")

    sub("11.2  Auth guards")
    req("GET", "/api/support-staff/dashboard/",
        expected=401, label="No token -> 401", phase="SupportStaff")
    if res_token:
        req("GET", "/api/support-staff/dashboard/",
            token=res_token, expected=403,
            label="Resident on support dashboard -> 403", phase="SupportStaff")

    sub("11.3  Assigned Tickets -- list + filters")
    _, ticket_list = req("GET", "/api/support-staff/assigned-tickets/",
                         token=_ss, expected=200,
                         label="List tickets", phase="SupportStaff")
    if ticket_list:
        cnt = ticket_list.get("count", len(ticket_list.get("results", [])))
        print(f"        tickets count={cnt}")

    req("GET", "/api/support-staff/assigned-tickets/",
        token=_ss, params={"status": "open"},
        expected=200, label="Filter tickets status=open", phase="SupportStaff")
    req("GET", "/api/support-staff/assigned-tickets/",
        token=_ss, params={"priority": "high"},
        expected=200, label="Filter tickets priority=high", phase="SupportStaff")
    req("GET", "/api/support-staff/assigned-tickets/",
        token=_ss, params={"search": "payment"},
        expected=200, label="Search tickets", phase="SupportStaff")

    sub("11.4  Create + CRUD a ticket")
    new_ticket_id = None
    _ct2 = soc_token or sa_token
    support_profile_id = None
    try:
        from apps.roles_permissions.models import UserProfile
        spp = UserProfile.objects.get(mobile=SUPPORT_MOBILE)
        support_profile_id = spp.pk
    except Exception:
        pass

    if _ct2:
        _, new_ticket = req("POST", "/api/support-staff/assigned-tickets/",
                            token=_ss,
                            json_body={
                                "subject": f"E2E Payment Issue {_RUN}",
                                "category": "app_issue",
                                "priority": "medium",
                                "description": "Resident cannot see payment receipt",
                                **({"resident": RES_PROF_ID} if RES_PROF_ID else {}),
                            },
                            expected=201, label="Create ticket", phase="SupportStaff")
        if new_ticket:
            d = new_ticket.get("data") or new_ticket
            new_ticket_id = d.get("id") if isinstance(d, dict) else None
            if new_ticket_id:
                check(d.get("status") == "open", "New ticket status==open",
                      str(d.get("status")))
                check("ticket_id" in d, "Ticket has ticket_id field")

    if new_ticket_id:
        req("GET", f"/api/support-staff/assigned-tickets/{new_ticket_id}/",
            token=_ss, expected=200, label="Retrieve ticket", phase="SupportStaff")

        _, pickup_r = req("PATCH", f"/api/support-staff/assigned-tickets/{new_ticket_id}/pickup/",
                          token=_ss, expected=200,
                          label="Pick up ticket (OPEN -> IN_PROGRESS)", phase="SupportStaff")
        if pickup_r:
            d = (pickup_r.get("data") or pickup_r)
            check(d.get("status") == "in_progress", "After pickup: status==in_progress",
                  str(d.get("status")))

        _, resolve_r = req("PATCH", f"/api/support-staff/assigned-tickets/{new_ticket_id}/resolve/",
                           token=_ss,
                           json_body={"resolution_notes": "Sent receipt via email", "time_taken": "30 mins"},
                           expected=200,
                           label="Resolve ticket (IN_PROGRESS -> RESOLVED)", phase="SupportStaff")
        if resolve_r:
            d = (resolve_r.get("data") or resolve_r)
            check(d.get("status") == "resolved", "After resolve: status==resolved",
                  str(d.get("status")))
            check(d.get("resolution_notes") == "Sent receipt via email",
                  "resolution_notes saved")

        req("PATCH", f"/api/support-staff/assigned-tickets/{new_ticket_id}/resolve/",
            token=_ss, expected=400,
            label="Resolve already-resolved ticket -> 400", phase="SupportStaff")

    req("GET", "/api/support-staff/assigned-tickets/999999/",
        token=_ss, expected=404, label="Ticket 999999 -> 404", phase="SupportStaff")

    sub("11.5  Ticket Updates")
    # Requires ?ticket=<id> — use the created ticket if available, else expect 400
    if new_ticket_id:
        req("GET", "/api/support-staff/ticket-updates/",
            token=_ss, params={"ticket": new_ticket_id},
            expected=200, label="Ticket updates list (with ticket id)", phase="SupportStaff")
    else:
        req("GET", "/api/support-staff/ticket-updates/",
            token=_ss, expected=400,
            label="Ticket updates list (no ticket param) -> 400", phase="SupportStaff")

    sub("11.6  Escalations")
    req("GET", "/api/support-staff/escalations/",
        token=_ss, expected=200, label="Escalations list", phase="SupportStaff")

    sub("11.7  Service History")
    req("GET", "/api/support-staff/service-history/",
        token=_ss, expected=200, label="Service history list", phase="SupportStaff")


# =============================================================================
# PHASE 12 -- DELIVERY PARTNER APIs
# =============================================================================
section("PHASE 12 -- Delivery Partner APIs")

DELIVERY_MOBILE = "9000000020"   # Priya Sharma (delivery-partner), society 11

sub("12.0  Delivery Partner login")
delivery_token = None
_, dp_body = req("POST", "/api/accounts/login/mobile/",
                 json_body={"mobile": DELIVERY_MOBILE, "otp_code": OTP},
                 expected=200, label="Delivery partner OTP login", phase="DeliveryPartner",
                 show_fail=False)
if dp_body:
    delivery_token, _ = tokens_from(dp_body)
if not delivery_token:
    delivery_token = soc_token or sa_token
    print("        [INFO] Delivery login failed — using society-admin token as fallback")
else:
    check(delivery_token is not None, "Delivery partner login returned access token")
    if dp_body:
        d = dp_body.get("data", {})
        check(d.get("role", {}).get("slug") == "delivery-partner",
              "Login role.slug == delivery-partner")
        check(dp_body.get("home_route") == "delivery_partner_dashboard",
              "Login home_route == delivery_partner_dashboard",
              str(dp_body.get("home_route")))

_dp = delivery_token
if not _dp:
    print("  !! No delivery partner token — skipping Phase 12")
else:
    sub("12.1  Dashboard")
    _, dpd = req("GET", "/api/delivery-partner/dashboard/",
                 token=_dp, expected=200, label="Delivery dashboard", phase="DeliveryPartner")
    if dpd and isinstance(dpd, dict):
        d = dpd.get("data") or {}
        check("stats" in d, "Dashboard has stats")
        s = d.get("stats") or {}
        for k in ("total_today", "pending", "delivered", "failed"):
            check(k in s, f"Dashboard stats has {k}")

    sub("12.2  Auth guards")
    req("GET", "/api/delivery-partner/dashboard/",
        expected=401, label="No token -> 401", phase="DeliveryPartner")
    if res_token:
        req("GET", "/api/delivery-partner/dashboard/",
            token=res_token, expected=403,
            label="Resident on delivery dashboard -> 403", phase="DeliveryPartner")

    sub("12.3  Active Deliveries -- list")
    _, dl_list = req("GET", "/api/delivery-partner/active-deliveries/",
                     token=_dp, expected=200,
                     label="List active deliveries", phase="DeliveryPartner")
    if dl_list:
        cnt = dl_list.get("count", len(dl_list.get("results", [])))
        print(f"        deliveries count={cnt}")

    req("GET", "/api/delivery-partner/active-deliveries/",
        token=_dp, params={"status": "pending"},
        expected=200, label="Filter deliveries status=pending", phase="DeliveryPartner")

    sub("12.4  Create delivery + pickup + delivered flow")
    new_dlv_id = None
    _soc_or_sa = soc_token or sa_token

    if _soc_or_sa:
        _, new_dlv = req("POST", "/api/delivery-partner/active-deliveries/",
                         token=_dp,
                         json_body={
                             "item_name": f"E2E Package {_RUN}",
                             "vendor_name": "Amazon",
                             "tracking_number": f"TRK{_RUN}",
                             "resident_name": "Aarav Sharma",
                             "resident_phone": "9100000001",
                             "flat_number": FLAT_NUMBER,
                         },
                         expected=201, label="Create delivery", phase="DeliveryPartner")
        if new_dlv:
            d = new_dlv.get("data") or new_dlv
            new_dlv_id = d.get("id") if isinstance(d, dict) else None
            if new_dlv_id:
                check(d.get("status") == "pending", "New delivery status==pending",
                      str(d.get("status")))
                check("delivery_id" in d, "Delivery has delivery_id (DLV-XXXX)")

    if new_dlv_id:
        req("GET", f"/api/delivery-partner/active-deliveries/{new_dlv_id}/",
            token=_dp, expected=200, label="Retrieve delivery", phase="DeliveryPartner")

        _, pickup_r = req("PATCH", f"/api/delivery-partner/active-deliveries/{new_dlv_id}/pickup/",
                          token=_dp, expected=200,
                          label="Pickup delivery (PENDING -> OUT_FOR_DELIVERY)", phase="DeliveryPartner")
        if pickup_r:
            d = (pickup_r.get("data") or pickup_r)
            check(d.get("status") == "out_for_delivery",
                  "After pickup: status==out_for_delivery", str(d.get("status")))

        _, delivered_r = req("PATCH", f"/api/delivery-partner/active-deliveries/{new_dlv_id}/delivered/",
                             token=_dp,
                             json_body={"delivery_note": "Left with security"},
                             expected=200,
                             label="Mark delivered (OUT_FOR_DELIVERY -> DELIVERED)", phase="DeliveryPartner")
        if delivered_r:
            d = (delivered_r.get("data") or delivered_r)
            check(d.get("status") == "delivered", "After delivered: status==delivered",
                  str(d.get("status")))

        req("PATCH", f"/api/delivery-partner/active-deliveries/{new_dlv_id}/delivered/",
            token=_dp, expected=400,
            label="Double-deliver already-delivered -> 400", phase="DeliveryPartner")

    sub("12.5  Delivery History")
    _, dh_list = req("GET", "/api/delivery-partner/delivery-history/",
                     token=_dp, expected=200,
                     label="Delivery history", phase="DeliveryPartner")
    if dh_list:
        print(f"        history count={dh_list.get('count', '?')}")

    sub("12.6  Access Pass -- get/create")
    _, ap_resp = req("GET", "/api/delivery-partner/access-pass/",
                     token=_dp, expected=200,
                     label="GET/create access pass", phase="DeliveryPartner")
    dp_passcode = dp_qr_value = None
    if ap_resp and isinstance(ap_resp, dict):
        d = ap_resp.get("data") or {}
        check(d.get("status") == "active", "Access pass status==active",
              str(d.get("status")))
        check("passcode" in d, "Access pass has passcode field")
        check("qr_code_value" in d, "Access pass has qr_code_value field")
        check("valid_until" in d, "Access pass has valid_until field")
        dp_passcode  = d.get("passcode")
        dp_qr_value  = d.get("qr_code_value")
        print(f"        passcode={dp_passcode}")

    sub("12.7  Show QR Code")
    _, qr_resp = req("GET", "/api/delivery-partner/access-pass/qr/",
                     token=_dp, expected=200,
                     label="Show QR code", phase="DeliveryPartner")
    if qr_resp and isinstance(qr_resp, dict):
        d = qr_resp.get("data") or {}
        check("qr_code_value" in d, "QR response has qr_code_value")
        check("passcode" in d, "QR response has passcode")
        check("valid_until" in d, "QR response has valid_until")

    sub("12.8  Entry Status")
    _, es_resp = req("GET", "/api/delivery-partner/access-pass/entry-status/",
                     token=_dp, expected=200,
                     label="Entry status", phase="DeliveryPartner")
    if es_resp and isinstance(es_resp, dict):
        d = es_resp.get("data") or {}
        check("entry_confirmed" in d, "Entry status has entry_confirmed field")
        check("status" in d, "Entry status has status field")
        check("passcode" in d, "Entry status has passcode field")

    sub("12.9  OTP Verification")
    # This app's urls.py is a stub (urlpatterns = []) — expect 404 until implemented
    req("GET", "/api/delivery-partner/otp-verification/",
        token=_dp, expected=[200, 404],
        label="OTP verification (stub app, may 404)", phase="DeliveryPartner")

    sub("12.10  Profile")
    # This app's urls.py is a stub (urlpatterns = []) — expect 404 until implemented
    req("GET", "/api/delivery-partner/profile/",
        token=_dp, expected=[200, 404],
        label="Delivery partner profile (stub app, may 404)", phase="DeliveryPartner")

    sub("12.11  Cross-role: guest cannot access delivery endpoints -> 403")
    if res_token:
        req("GET", "/api/delivery-partner/access-pass/",
            token=res_token, expected=403,
            label="Resident on delivery access-pass -> 403", phase="DeliveryPartner")


# =============================================================================
# PHASE 13 -- GUEST USER APIs
# =============================================================================
section("PHASE 13 -- Guest User APIs")

GUEST_MOBILE = "9000000030"   # Rahul Guest, guest-user, society 11

sub("13.0  Guest User login")
guest_token = None
_, gu_body = req("POST", "/api/accounts/login/mobile/",
                 json_body={"mobile": GUEST_MOBILE, "otp_code": OTP},
                 expected=200, label="Guest user OTP login", phase="GuestUser",
                 show_fail=False)
if gu_body:
    guest_token, _ = tokens_from(gu_body)
if not guest_token:
    guest_token = soc_token or sa_token
    print("        [INFO] Guest login failed — using society-admin token as fallback")
else:
    check(guest_token is not None, "Guest user login returned access token")
    if gu_body:
        d = gu_body.get("data", {})
        check(d.get("role", {}).get("slug") == "guest-user",
              "Login role.slug == guest-user")
        check(gu_body.get("home_route") == "guest_user_dashboard",
              "Login home_route == guest_user_dashboard",
              str(gu_body.get("home_route")))

_gu = guest_token
if not _gu:
    print("  !! No guest user token — skipping Phase 13")
else:
    sub("13.1  Auth guards")
    req("GET", "/api/guest/access-pass/",
        expected=401, label="No token -> 401", phase="GuestUser")
    if res_token:
        req("GET", "/api/guest-user/access-pass/",
            token=res_token, expected=403,
            label="Resident on guest access-pass -> 403", phase="GuestUser")

    sub("13.2  Access Pass -- get/create")
    _, gap_resp = req("GET", "/api/guest-user/access-pass/",
                      token=_gu, expected=200,
                      label="GET/create guest access pass", phase="GuestUser")
    gu_passcode = gu_qr_value = None
    if gap_resp and isinstance(gap_resp, dict):
        d = gap_resp.get("data") or {}
        check(d.get("status") == "active", "Guest pass status==active",
              str(d.get("status")))
        check("passcode" in d, "Guest pass has passcode field")
        check("qr_code_value" in d, "Guest pass has qr_code_value field")
        check("valid_until" in d, "Guest pass has valid_until field")
        gu_passcode = d.get("passcode")
        gu_qr_value = d.get("qr_code_value")
        print(f"        guest passcode={gu_passcode}")

    sub("13.3  Show QR Code")
    _, gqr_resp = req("GET", "/api/guest-user/access-pass/qr/",
                      token=_gu, expected=200,
                      label="Guest show QR code", phase="GuestUser")
    if gqr_resp and isinstance(gqr_resp, dict):
        d = gqr_resp.get("data") or {}
        check("qr_code_value" in d, "Guest QR response has qr_code_value")
        check("passcode" in d, "Guest QR response has passcode")
        check("visitor_name" in d, "Guest QR response has visitor_name")

    sub("13.4  Entry Status")
    _, ges_resp = req("GET", "/api/guest-user/access-pass/entry-status/",
                      token=_gu, expected=200,
                      label="Guest entry status", phase="GuestUser")
    if ges_resp and isinstance(ges_resp, dict):
        d = ges_resp.get("data") or {}
        check("entry_confirmed" in d, "Guest entry status has entry_confirmed")
        check("status" in d, "Guest entry status has status field")
        check("passcode" in d, "Guest entry status has passcode field")

    sub("13.5  Old /api/guest/ prefix also works")
    req("GET", "/api/guest/access-pass/",
        token=_gu, expected=200,
        label="Old /api/guest/access-pass/ prefix works", phase="GuestUser")

    sub("13.6  Guest profile")
    # This app's urls.py is a stub (urlpatterns = []) — expect 404 until implemented
    req("GET", "/api/guest/profile/",
        token=_gu, expected=[200, 404],
        label="Guest profile (stub app, may 404)", phase="GuestUser")

    sub("13.7  Cross-role: delivery partner cannot use guest endpoints -> 403")
    if delivery_token and delivery_token not in (soc_token, sa_token):
        req("GET", "/api/guest-user/access-pass/",
            token=delivery_token, expected=403,
            label="Delivery partner on guest access-pass -> 403", phase="GuestUser")


# =============================================================================
# PHASE 14 -- ACCESS PASS SCANNER (Security Guard)
# =============================================================================
section("PHASE 14 -- Access Pass Scanner (Security Guard)")

_sg14 = guard_token or soc_token or sa_token

if not _sg14:
    print("  !! No guard token — skipping Phase 14")
else:
    sub("14.1  Auth guard on scanner endpoint")
    req("POST", "/api/security-guard/scan-access-pass/",
        json_body={"qr_code_value": "dummy"},
        expected=401, label="No token scan -> 401", phase="Scanner")
    if res_token:
        req("POST", "/api/security-guard/scan-access-pass/",
            token=res_token, json_body={"qr_code_value": "dummy"},
            expected=403, label="Resident on scan -> 403", phase="Scanner")

    sub("14.2  Scan with invalid QR -> 400")
    _, inv_scan = req("POST", "/api/security-guard/scan-access-pass/",
                      token=_sg14,
                      json_body={"qr_code_value": "INVALID_QR_DOESNT_EXIST_E2E", "gate": "Main Gate"},
                      expected=400, label="Scan invalid QR -> 400", phase="Scanner")
    if inv_scan and isinstance(inv_scan, dict):
        check("message" in inv_scan or "detail" in inv_scan, "Error response has message/detail")

    sub("14.3  Scan with valid delivery-partner QR")
    if dp_qr_value and dp_qr_value != gu_qr_value:
        # NOTE: After this scan the pass becomes USED; subsequent scans will fail as expired/used
        _, scan_dp = req("POST", "/api/security-guard/scan-access-pass/",
                         token=_sg14,
                         json_body={"qr_code_value": dp_qr_value, "gate": "East Gate"},
                         expected=[200, 400],
                         label=f"Scan delivery partner QR (may already be used)", phase="Scanner")
        if scan_dp and isinstance(scan_dp, dict):
            if scan_dp.get("status") == "success":
                check("access_pass" in scan_dp, "Scan success has access_pass block")
                ap_block = scan_dp.get("access_pass") or {}
                check("passcode" in ap_block, "access_pass block has passcode")
                check("visitor_name" in ap_block, "access_pass block has visitor_name")
                check("gate" in ap_block, "access_pass block has gate")
                check("entry_confirmed_at" in ap_block, "access_pass block has entry_confirmed_at")
                print(f"        Scan success: visitor={ap_block.get('visitor_name')} gate={ap_block.get('gate')}")
            else:
                print(f"        Pass already used/expired (ok for repeat runs): {scan_dp.get('message')}")

    sub("14.4  Scan with valid guest QR (new pass for clean state)")
    # Request a fresh guest pass for scanning
    if _gu:
        _, fresh_gap = req("GET", "/api/guest-user/access-pass/",
                           token=_gu, expected=200,
                           label="Refresh guest access pass before scan", phase="Scanner",
                           show_fail=False)
        fresh_gu_qr = None
        if fresh_gap and isinstance(fresh_gap, dict):
            d = fresh_gap.get("data") or {}
            if d.get("status") == "active":
                fresh_gu_qr = d.get("qr_code_value")

        if fresh_gu_qr:
            _, scan_gu = req("POST", "/api/security-guard/scan-access-pass/",
                             token=_sg14,
                             json_body={"qr_code_value": fresh_gu_qr, "gate": "Main Gate"},
                             expected=[200, 400],
                             label="Scan guest user QR", phase="Scanner")
            if scan_gu and isinstance(scan_gu, dict):
                if scan_gu.get("status") == "success":
                    ap_block = scan_gu.get("access_pass") or {}
                    check("visitor_name" in ap_block, "Guest scan success has visitor_name")
                    print(f"        Guest scan success: visitor={ap_block.get('visitor_name')}")

    sub("14.5  Scan with passcode (text entry fallback)")
    if dp_passcode:
        _, scan_pc = req("POST", "/api/security-guard/scan-access-pass/",
                         token=_sg14,
                         json_body={"passcode": dp_passcode, "gate": "Main Gate"},
                         expected=[200, 400],
                         label="Scan by passcode (text entry)", phase="Scanner")
        if scan_pc and isinstance(scan_pc, dict):
            # If USED it returns 400; that's ok — we just verify the API handled it
            check("status" in scan_pc or "message" in scan_pc,
                  "Scan-by-passcode returns status or message")

    sub("14.6  Access Scan Logs")
    _, logs = req("GET", "/api/security-guard/access-scan-logs/",
                  token=_sg14, expected=200,
                  label="GET access scan logs", phase="Scanner")
    if logs and isinstance(logs, dict):
        results_list = logs.get("results") or []
        check(isinstance(results_list, list), "Scan logs is a list")
        if results_list:
            first_log = results_list[0]
            check("scan_result" in first_log, "Log has scan_result field")
            check("gate" in first_log, "Log has gate field")
            check("scanned_at" in first_log, "Log has scanned_at field")
        print(f"        {len(results_list)} scan log(s) found")

    sub("14.7  Missing body -> 400")
    req("POST", "/api/security-guard/scan-access-pass/",
        token=_sg14, json_body={},
        expected=400, label="Empty scan body -> 400", phase="Scanner")


# =============================================================================
# SUMMARY
# =============================================================================
section("TEST SUMMARY")

total  = len(results)
passed = sum(1 for r in results if r.ok)
failed = sum(1 for r in results if not r.ok)
pct    = 100 * passed // total if total else 0

print(f"\n  Total  : {total}")
print(f"  Passed : {passed}  ({pct}%)")
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
