import { useSyncExternalStore } from "react";
import api, { setTokens, clearTokens } from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

export type RoleSlug =
  | "super-admin" | "society-admin" | "accountant"
  | "resident"    | "security-guard" | "maintenance"
  | "maintenance-staff" | "support-staff"
  | "delivery-partner"  | "delivery"
  | "guest-user"        | "guest";

// Legacy Role string kept for backward-compat with existing UI components
export type Role =
  | "Super Admin"   | "Society Admin"  | "Resident"
  | "Security Guard" | "Accountant"   | "Maintenance Staff"
  | "Support Staff"  | "Delivery Partner" | "Guest User";

export interface AuthUser {
  id:          string;
  full_name:   string;
  mobile:      string;
  email:       string;
  status:      string;
  flat_number: string | null;
  role: {
    id:        number;
    name:      string;
    slug:      RoleSlug;
    role_type: string;
  };
  society: {
    id:   number;
    name: string;
    city: string;
    plan: string;
  } | null;
  features: Array<{
    module:     string;
    label:      string;
    can_view:   boolean;
    can_create: boolean;
    can_edit:   boolean;
    can_delete: boolean;
  }>;
}

// User shape kept for legacy components that call useAuth()
export interface User {
  name:  string;
  email: string;
  role:  Role;
  phone: string;
}

// ── Maps ─────────────────────────────────────────────────────────────────────

const SLUG_TO_ROLE: Record<string, Role> = {
  "super-admin":       "Super Admin",
  "society-admin":     "Society Admin",
  "resident":          "Resident",
  "security-guard":    "Security Guard",
  "accountant":        "Accountant",
  "maintenance-staff": "Maintenance Staff",
  "maintenance":       "Maintenance Staff",
  "support-staff":     "Support Staff",
  "delivery-partner":  "Delivery Partner",
  "delivery":          "Delivery Partner",
  "guest-user":        "Guest User",
  "guest":             "Guest User",
};

// Maps backend home_route → React Router path
const HOME_ROUTES: Record<string, string> = {
  platform_admin_dashboard:    "/super/dashboard",
  society_admin_dashboard:     "/dashboard",
  accountant_dashboard:        "/accounting/dashboard",
  resident_dashboard:          "/resident/dashboard",
  security_guard_dashboard:    "/guard/dashboard",
  maintenance_staff_dashboard: "/maintenance/dashboard",
  support_staff_dashboard:     "/support/dashboard",
  delivery_partner_dashboard:  "/delivery-partner/dashboard",
  guest_user_dashboard:        "/guest-user/access-pass",
};

// ── Internal state ───────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let legacyUser: User     | null = null;
let fullUser:   AuthUser | null = null;
let hydrated = false;

function notify() { listeners.forEach((l) => l()); }

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem("auth_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support both old (plain User) and new ({ legacy, full }) shapes
      legacyUser = parsed.legacy ?? parsed;
      fullUser   = parsed.full   ?? null;
      notify();
    }
  } catch { /* silent */ }
}

function persist() {
  if (typeof window === "undefined") return;
  if (legacyUser) {
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ legacy: legacyUser, full: fullUser })
    );
  } else {
    localStorage.removeItem("auth_user");
  }
}

// ── Auth object (stable reference, not a hook) ────────────────────────────────

export const auth = {
  // ── Reads ──
  get user():     User | null     { return legacyUser; },
  get authUser(): AuthUser | null { return fullUser; },

  // ── Real API: send OTP ──
  async sendOtp(mobile: string): Promise<void> {
    await api.post("/accounts/otp/send/", { mobile });
  },

  // ── Real API: mobile + OTP login ──
  async loginWithMobile(
    mobile:  string,
    otpCode: string
  ): Promise<string> {
    const { data } = await api.post("/accounts/login/mobile/", {
      mobile,
      otp_code: otpCode,
    });

    // Persist tokens
    setTokens(data.tokens);

    // Build full user object
    const d = data.data;
    fullUser = {
      id:          d.id,
      full_name:   d.full_name,
      mobile:      d.mobile,
      email:       d.email,
      status:      d.status,
      flat_number: d.flat_number ?? null,
      role:        d.role,
      society:     d.society   ?? null,
      features:    d.features  ?? [],
    };

    // Build legacy user object
    legacyUser = {
      name:  d.full_name,
      email: d.email,
      role:  SLUG_TO_ROLE[d.role?.slug ?? ""] ?? "Society Admin",
      phone: d.mobile,
    };

    persist();
    notify();

    // Return the React Router path to navigate to
    return HOME_ROUTES[data.home_route] ?? "/dashboard";
  },

  // ── Logout ──
  logout() {
    legacyUser = null;
    fullUser   = null;
    clearTokens();
    persist();
    notify();
  },

  // ── Legacy helpers — kept so existing components still compile ──
  login(phone: string, role: Role = "Society Admin") {
    legacyUser = {
      name:  "Admin",
      email: "admin@minigate.in",
      role,
      phone,
    };
    persist();
    notify();
  },
  setRole(role: Role) {
    if (!legacyUser) {
      legacyUser = { name: "Admin", email: "admin@minigate.in", role, phone: "" };
    } else {
      legacyUser = { ...legacyUser, role };
    }
    persist();
    notify();
  },

  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// ── React hooks ──────────────────────────────────────────────────────────────

const subscribe = (l: Listener) => {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Returns the legacy User shape (backward-compat) */
export function useAuth() {
  return useSyncExternalStore(subscribe, () => legacyUser, () => null);
}

/** Returns the full backend AuthUser (role slug, society, features …) */
export function useAuthUser() {
  return useSyncExternalStore(subscribe, () => fullUser, () => null);
}
