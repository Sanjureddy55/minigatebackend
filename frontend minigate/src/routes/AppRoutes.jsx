import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, Component } from 'react'
import { ProtectedRoute, PublicRoute } from '../guards/ProtectedRoute.jsx'
import { AppLayout } from '../layouts/AppLayout.jsx'

// ── Loading fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  )
}

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-full items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl font-bold text-destructive">Error</div>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'Something went wrong.'}
            </p>
            <pre className="text-xs text-left bg-muted p-3 rounded-xl overflow-auto max-h-48">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-teal px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Auth Pages ───────────────────────────────────────────────
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'))
const OnboardingPage = lazy(() => import('../pages/auth/OnboardingPage.jsx'))
const PendingApproval = lazy(() => import('../pages/PendingApproval.jsx'))

// ── Platform Admin ───────────────────────────────────────────
const PlatformDashboard = lazy(() => import('../pages/platform-admin/Dashboard.jsx'))
const PlatformSocieties = lazy(() => import('../pages/platform-admin/Societies.jsx'))
const PlatformUsers = lazy(() => import('../pages/platform-admin/Users.jsx'))
const PlatformSocietyAdmins = lazy(() => import('../pages/platform-admin/SocietyAdmins.jsx'))
const PlatformReports = lazy(() => import('../pages/platform-admin/Reports.jsx'))
const PlatformAudit = lazy(() => import('../pages/platform-admin/AuditLogs.jsx'))
const PlatformSettings = lazy(() => import('../pages/platform-admin/Settings.jsx'))
const PlatformPlans = lazy(() => import('../pages/platform-admin/SubscriptionPlans.jsx'))

// ── Society Admin ────────────────────────────────────────────
const SocietyDashboard = lazy(() => import('../pages/society-admin/Dashboard.jsx'))
const SocietyResidents = lazy(() => import('../pages/society-admin/Residents.jsx'))
const SocietyVisitors  = lazy(() => import('../pages/society-admin/Visitors.jsx'))
const SocietyApprovals = lazy(() => import('../pages/society-admin/Approvals.jsx'))
const SocietyComplaints = lazy(() => import('../pages/society-admin/Complaints.jsx'))
const SocietyNoticeBoard = lazy(() => import('../pages/society-admin/NoticeBoard.jsx'))
const SocietyBuildings = lazy(() => import('../pages/society-admin/Buildings.jsx'))
const SocietyFlats = lazy(() => import('../pages/society-admin/Flats.jsx'))
const SocietySecurityOperations = lazy(() => import('../pages/society-admin/Security.jsx'))
const SocietyAnalytics = lazy(() => import('../pages/society-admin/Analytics.jsx'))
const SocietyPayments = lazy(() => import('../pages/society-admin/Payments.jsx'))
const SocietyExpenses = lazy(() => import('../pages/society-admin/Expenses.jsx'))
const SocietyStatements = lazy(() => import('../pages/society-admin/Statements.jsx'))
const SocietySettings = lazy(() => import('../pages/society-admin/Settings.jsx'))

// ── Resident ─────────────────────────────────────────────────
const ResidentDashboard = lazy(() => import('../pages/resident/Dashboard.jsx'))
const ResidentComplaints = lazy(() => import('../pages/resident/Complaints.jsx'))
const ResidentNotices = lazy(() => import('../pages/resident/Notices.jsx'))
const ResidentPayments = lazy(() => import('../pages/resident/Payments.jsx'))
const ResidentVisitors = lazy(() => import('../pages/resident/Visitors.jsx'))
const ResidentFamily = lazy(() => import('../pages/resident/Family.jsx'))
const ResidentVehicles = lazy(() => import('../pages/resident/Vehicles.jsx'))
const ResidentStatements = lazy(() => import('../pages/resident/Statements.jsx'))
const ResidentMaintenance = lazy(() => import('../pages/resident/Maintenance.jsx'))

// ── Accountant ───────────────────────────────────────────────
const AccountantDashboard = lazy(() => import('../pages/accountant/Dashboard.jsx'))
const AccountantDues = lazy(() => import('../pages/accountant/Dues.jsx'))
const AccountantPayments = lazy(() => import('../pages/accountant/Payments.jsx'))
const AccountantExpenses = lazy(() => import('../pages/accountant/Expenses.jsx'))
const AccountantStatements = lazy(() => import('../pages/accountant/Statements.jsx'))
const AccountantReceipts = lazy(() => import('../pages/accountant/Receipts.jsx'))
const AccountantReports = lazy(() => import('../pages/accountant/Reports.jsx'))
const AccountantFund = lazy(() => import('../pages/accountant/FundDashboard.jsx'))

// ── Delivery Partner ─────────────────────────────────────────
const DeliveryDashboard    = lazy(() => import('../pages/delivery/Dashboard.jsx'))
const DeliveryActive       = lazy(() => import('../pages/delivery/ActiveDeliveries.jsx'))
const DeliveryHistory      = lazy(() => import('../pages/delivery/History.jsx'))
const DeliveryAccessPass   = lazy(() => import('../pages/delivery/AccessPass.jsx'))
const DeliveryShowQR       = lazy(() => import('../pages/delivery/ShowQRCode.jsx'))
const DeliveryEntryStatus  = lazy(() => import('../pages/delivery/EntryStatus.jsx'))

// ── Guest User ────────────────────────────────────────────────
const GuestAccessPass   = lazy(() => import('../pages/guest/AccessPass.jsx'))
const GuestShowQR       = lazy(() => import('../pages/guest/ShowQRCode.jsx'))
const GuestEntryStatus  = lazy(() => import('../pages/guest/EntryStatus.jsx'))

// ── Security Guard Scanner ────────────────────────────────────
const AccessPassScanner = lazy(() => import('../pages/security-guard/AccessPassScanner.jsx'))

// ── Maintenance Staff ────────────────────────────────────────
const MaintenanceDashboard = lazy(() => import('../pages/maintenance/Dashboard.jsx'))
const MaintenanceTasks     = lazy(() => import('../pages/maintenance/Tasks.jsx'))
const MaintenanceHistory   = lazy(() => import('../pages/maintenance/History.jsx'))
const MaintenanceMaterials = lazy(() => import('../pages/maintenance/Materials.jsx'))
const MaintenanceSchedule  = lazy(() => import('../pages/maintenance/Schedule.jsx'))

// ── Support Staff ─────────────────────────────────────────────
const SupportDashboard   = lazy(() => import('../pages/support/Dashboard.jsx'))
const SupportTickets     = lazy(() => import('../pages/support/Tickets.jsx'))
const SupportEscalations = lazy(() => import('../pages/support/Escalations.jsx'))
const SupportHistory     = lazy(() => import('../pages/support/History.jsx'))

// ── Utility pages ────────────────────────────────────────────
function Unauthorized() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">403</h1>
        <p className="mt-2 text-muted-foreground">Access denied.</p>
        <a href="/" className="mt-4 inline-block text-primary underline">Go home</a>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
        <a href="/" className="mt-4 inline-block text-primary underline">Go home</a>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* Semi-public */}
          <Route path="/pending-approval" element={<PendingApproval />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              {/* Platform Admin */}
              <Route element={<ProtectedRoute allowedRoles={['super-admin']} />}>
                <Route path="/admin/platform"           element={<PlatformDashboard />} />
                <Route path="/admin/societies"          element={<PlatformSocieties />} />
                <Route path="/admin/subscription-plans" element={<PlatformPlans />} />
                <Route path="/admin/users"              element={<PlatformUsers />} />
                <Route path="/admin/society-admins"     element={<PlatformSocietyAdmins />} />
                <Route path="/admin/reports"            element={<PlatformReports />} />
                <Route path="/admin/audit"              element={<PlatformAudit />} />
                <Route path="/admin/settings"           element={<PlatformSettings />} />
              </Route>

              {/* Society Admin */}
              <Route element={<ProtectedRoute allowedRoles={['society-admin', 'super-admin']} />}>
                <Route path="/society/dashboard"      element={<SocietyDashboard />} />
                <Route path="/society/residents"      element={<SocietyResidents />} />
                <Route path="/society/visitors"       element={<SocietyVisitors />} />
                <Route path="/society/approvals"      element={<SocietyApprovals />} />
                <Route path="/society/complaints"     element={<SocietyComplaints />} />
                <Route path="/society/notices"        element={<SocietyNoticeBoard />} />
                <Route path="/society/buildings"      element={<SocietyBuildings />} />
                <Route path="/society/flats"          element={<SocietyFlats />} />
                <Route path="/society/analytics"      element={<SocietyAnalytics />} />
                <Route path="/society/payments"       element={<SocietyPayments />} />
                <Route path="/society/expenses"       element={<SocietyExpenses />} />
                <Route path="/society/statements"     element={<SocietyStatements />} />
                <Route path="/society/settings"       element={<SocietySettings />} />
                <Route path="/society/staff"          element={<SocietyResidents />} />
                <Route path="/society/vendors"        element={<SocietyResidents />} />
                <Route path="/society/audit"          element={<PlatformAudit />} />
                <Route path="/society/roles"          element={<SocietyResidents />} />
                <Route path="/society/security"       element={<SocietySecurityOperations />} />
                <Route path="/society/fund"           element={<SocietyAnalytics />} />
                <Route path="/society/notifications"  element={<SocietySettings />} />
              </Route>

              {/* Resident */}
              <Route element={<ProtectedRoute allowedRoles={['resident']} />}>
                <Route path="/resident/dashboard"   element={<ResidentDashboard />} />
                <Route path="/resident/complaints"  element={<ResidentComplaints />} />
                <Route path="/resident/notices"     element={<ResidentNotices />} />
                <Route path="/resident/payments"    element={<ResidentPayments />} />
                <Route path="/resident/visitors"    element={<ResidentVisitors />} />
                <Route path="/resident/family"      element={<ResidentFamily />} />
                <Route path="/resident/vehicles"    element={<ResidentVehicles />} />
                <Route path="/resident/statements"  element={<ResidentStatements />} />
                <Route path="/resident/maintenance" element={<ResidentMaintenance />} />
                <Route path="/resident/pets"        element={<ResidentFamily />} />
                <Route path="/resident/daily-help"  element={<ResidentFamily />} />
                <Route path="/resident/sos"         element={<ResidentDashboard />} />
              </Route>

              {/* Accountant */}
              <Route element={<ProtectedRoute allowedRoles={['accountant', 'society-admin', 'super-admin']} />}>
                <Route path="/accountant/dashboard"  element={<AccountantDashboard />} />
                <Route path="/accountant/dues"       element={<AccountantDues />} />
                <Route path="/accountant/payments"   element={<AccountantPayments />} />
                <Route path="/accountant/expenses"   element={<AccountantExpenses />} />
                <Route path="/accountant/statements" element={<AccountantStatements />} />
                <Route path="/accountant/receipts"   element={<AccountantReceipts />} />
                <Route path="/accountant/reports"    element={<AccountantReports />} />
                <Route path="/accountant/fund"       element={<AccountantFund />} />
              </Route>

              {/* Security Guard */}
              <Route element={<ProtectedRoute allowedRoles={['security-guard', 'society-admin', 'super-admin']} />}>
                <Route path="/guard/dashboard" element={<SocietyDashboard />} />
              </Route>

              {/* Maintenance Staff */}
              <Route element={<ProtectedRoute allowedRoles={['maintenance-staff', 'society-admin', 'super-admin']} />}>
                <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
                <Route path="/maintenance/tasks"     element={<MaintenanceTasks />} />
                <Route path="/maintenance/history"   element={<MaintenanceHistory />} />
                <Route path="/maintenance/materials" element={<MaintenanceMaterials />} />
                <Route path="/maintenance/schedule"  element={<MaintenanceSchedule />} />
              </Route>

              {/* Support Staff */}
              <Route element={<ProtectedRoute allowedRoles={['support-staff', 'society-admin', 'super-admin']} />}>
                <Route path="/support/dashboard"   element={<SupportDashboard />} />
                <Route path="/support/tickets"     element={<SupportTickets />} />
                <Route path="/support/escalations" element={<SupportEscalations />} />
                <Route path="/support/history"     element={<SupportHistory />} />
              </Route>

              {/* Delivery Partner */}
              <Route element={<ProtectedRoute allowedRoles={['delivery-partner', 'delivery', 'society-admin', 'super-admin']} />}>
                <Route path="/delivery-partner/dashboard"         element={<DeliveryDashboard />} />
                <Route path="/delivery-partner/active-deliveries" element={<DeliveryActive />} />
                <Route path="/delivery-partner/delivery-history"  element={<DeliveryHistory />} />
                <Route path="/delivery-partner/access-pass"       element={<DeliveryAccessPass />} />
                <Route path="/delivery-partner/show-qr-code"      element={<DeliveryShowQR />} />
                <Route path="/delivery-partner/entry-status"      element={<DeliveryEntryStatus />} />
              </Route>

              {/* Guest User */}
              <Route element={<ProtectedRoute allowedRoles={['guest-user', 'guest', 'society-admin', 'super-admin']} />}>
                <Route path="/guest-user/access-pass"  element={<GuestAccessPass />} />
                <Route path="/guest-user/show-qr-code" element={<GuestShowQR />} />
                <Route path="/guest-user/entry-status" element={<GuestEntryStatus />} />
              </Route>

              {/* Security Guard scanner */}
              <Route element={<ProtectedRoute allowedRoles={['security-guard', 'society-admin', 'super-admin']} />}>
                <Route path="/guard/scanner" element={<AccessPassScanner />} />
              </Route>

            </Route>
          </Route>

          {/* Utility */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
