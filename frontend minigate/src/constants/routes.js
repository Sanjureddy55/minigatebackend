export const ROUTES = {
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
  PENDING: '/pending-approval',

  // Platform Admin
  PLATFORM_DASHBOARD: '/admin/platform',
  PLATFORM_SOCIETIES: '/admin/societies',
  PLATFORM_CREATE_SOCIETY: '/admin/societies/new',
  PLATFORM_PLANS: '/admin/subscription-plans',
  PLATFORM_USERS: '/admin/users',
  PLATFORM_REPORTS: '/admin/reports',
  PLATFORM_AUDIT: '/admin/audit',
  PLATFORM_SETTINGS: '/admin/settings',
  PLATFORM_ADMINS: '/admin/society-admins',

  // Society Admin
  SOCIETY_DASHBOARD: '/society/dashboard',
  SOCIETY_RESIDENTS: '/society/residents',
  SOCIETY_APPROVALS: '/society/approvals',
  SOCIETY_COMPLAINTS: '/society/complaints',
  SOCIETY_NOTICES: '/society/notices',
  SOCIETY_BUILDINGS: '/society/buildings',
  SOCIETY_FLATS: '/society/flats',
  SOCIETY_ANALYTICS: '/society/analytics',
  SOCIETY_PAYMENTS: '/society/payments',
  SOCIETY_EXPENSES: '/society/expenses',
  SOCIETY_STATEMENTS: '/society/statements',
  SOCIETY_SETTINGS: '/society/settings',
  SOCIETY_STAFF: '/society/staff',
  SOCIETY_VENDORS: '/society/vendors',
  SOCIETY_AUDIT: '/society/audit',
  SOCIETY_ROLES: '/society/roles',

  // Resident
  RESIDENT_DASHBOARD: '/resident/dashboard',
  RESIDENT_COMPLAINTS: '/resident/complaints',
  RESIDENT_NOTICES: '/resident/notices',
  RESIDENT_PAYMENTS: '/resident/payments',
  RESIDENT_VISITORS: '/resident/visitors',
  RESIDENT_FAMILY: '/resident/family',
  RESIDENT_VEHICLES: '/resident/vehicles',
  RESIDENT_PETS: '/resident/pets',
  RESIDENT_HELP: '/resident/daily-help',
  RESIDENT_STATEMENTS: '/resident/statements',
  RESIDENT_MAINTENANCE: '/resident/maintenance',
  RESIDENT_SOS: '/resident/sos',
  RESIDENT_PROFILE: '/resident/profile',

  // Accountant
  ACCOUNTANT_DASHBOARD: '/accountant/dashboard',
  ACCOUNTANT_DUES: '/accountant/dues',
  ACCOUNTANT_PAYMENTS: '/accountant/payments',
  ACCOUNTANT_EXPENSES: '/accountant/expenses',
  ACCOUNTANT_FUND: '/accountant/fund',
  ACCOUNTANT_STATEMENTS: '/accountant/statements',
  ACCOUNTANT_RECEIPTS: '/accountant/receipts',
  ACCOUNTANT_REPORTS: '/accountant/reports',

  // Guard
  GUARD_DASHBOARD: '/guard/dashboard',

  // Delivery Partner
  DELIVERY_DASHBOARD:        '/delivery-partner/dashboard',
  DELIVERY_ACTIVE:           '/delivery-partner/active-deliveries',
  DELIVERY_HISTORY:          '/delivery-partner/delivery-history',
  DELIVERY_ACCESS_PASS:      '/delivery-partner/access-pass',
  DELIVERY_SHOW_QR:          '/delivery-partner/show-qr-code',
  DELIVERY_ENTRY_STATUS:     '/delivery-partner/entry-status',

  // Guest User
  GUEST_ACCESS_PASS:         '/guest-user/access-pass',
  GUEST_SHOW_QR:             '/guest-user/show-qr-code',
  GUEST_ENTRY_STATUS:        '/guest-user/entry-status',
}

export const HOME_ROUTE_MAP = {
  platform_admin_dashboard:    '/admin/platform',
  society_admin_dashboard:     '/society/dashboard',
  accountant_dashboard:        '/accountant/dashboard',
  resident_dashboard:          '/resident/dashboard',
  security_guard_dashboard:    '/guard/dashboard',
  maintenance_staff_dashboard: '/maintenance/dashboard',
  support_staff_dashboard:     '/support/dashboard',
  delivery_partner_dashboard:  '/delivery-partner/dashboard',
  guest_user_dashboard:        '/guest-user/access-pass',
}

export const ROLE_HOME_MAP = {
  'super-admin':       '/admin/platform',
  'society-admin':     '/society/dashboard',
  accountant:          '/accountant/dashboard',
  resident:            '/resident/dashboard',
  'security-guard':    '/guard/dashboard',
  'maintenance-staff': '/maintenance/dashboard',
  'support-staff':     '/support/dashboard',
  'delivery-partner':  '/delivery-partner/dashboard',
  'delivery':          '/delivery-partner/dashboard',
  'guest-user':        '/guest-user/access-pass',
  'guest':             '/guest-user/access-pass',
}
