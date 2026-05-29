import {
  LayoutDashboard, Users, UserCheck, ClipboardCheck, Shield, Bell, Settings,
  Building2, BarChart3, ShieldCheck, Home, Car, PawPrint, HandHelping,
  Wallet, FileText, AlertTriangle, QrCode, PhoneCall, Receipt,
  FileBarChart, Wrench, ListChecks, History, Globe, CreditCard, KeyRound,
  Megaphone, MessageSquareWarning, Scroll, ChevronDown, ReceiptText,
  PanelLeftClose, Truck, UserPlus, Network, Package, Calendar,
  Ticket, ArrowUpCircle, Bike, KeySquare, CheckCircle, LogIn,
} from 'lucide-react'

export const NAV_CONFIG = {
  'super-admin': [
    {
      label: 'Platform',
      items: [
        { to: '/admin/platform',          label: 'Global Dashboard',   icon: Globe },
        { to: '/admin/societies',          label: 'Society Management', icon: Building2 },
        { to: '/admin/society-admins',     label: 'Society Admins',     icon: ShieldCheck },
        { to: '/admin/subscription-plans', label: 'Subscription Plans', icon: CreditCard },
      ],
    },
    {
      label: 'Governance',
      items: [
        { to: '/admin/users',    label: 'Global Users',    icon: Users },
        { to: '/admin/reports',  label: 'Global Reports',  icon: FileBarChart },
        { to: '/admin/audit',    label: 'Audit Logs',      icon: Scroll },
        { to: '/admin/settings', label: 'System Settings', icon: Settings },
      ],
    },
  ],

  'society-admin': [
    {
      label: 'Operations',
      items: [
        { to: '/society/dashboard',  label: 'Society Dashboard', icon: LayoutDashboard },
        { to: '/society/residents',  label: 'Residents',         icon: Users },
        { to: '/society/visitors',   label: 'Visitors',          icon: UserCheck },
        { to: '/society/approvals',  label: 'Approvals',         icon: ClipboardCheck },
        { to: '/society/security',   label: 'Security',          icon: Shield },
      ],
    },
    {
      label: 'Society',
      items: [
        { to: '/society/buildings',  label: 'Buildings',         icon: Building2 },
        { to: '/society/flats',      label: 'Flats',             icon: Home },
        { to: '/society/staff',      label: 'Staff & Guards',    icon: ShieldCheck },
        { to: '/society/vendors',    label: 'Vendors',           icon: Truck },
        { to: '/society/notices',    label: 'Notice Board',      icon: Megaphone },
        { to: '/society/complaints', label: 'Complaints',        icon: MessageSquareWarning },
        { to: '/society/payments',   label: 'Payments Overview', icon: Wallet },
      ],
    },
    {
      label: 'Maintenance',
      items: [
        { to: '/society/fund',       label: 'Fund Dashboard',    icon: BarChart3 },
        { to: '/society/expenses',   label: 'Expenses',          icon: ReceiptText },
        { to: '/society/statements', label: 'Monthly Statements',icon: FileText },
      ],
    },
    {
      label: 'Insights',
      items: [
        { to: '/society/analytics',      label: 'Analytics',      icon: BarChart3 },
        { to: '/society/roles',          label: 'Roles & Access', icon: Network },
        { to: '/society/audit',          label: 'Audit Logs',     icon: Scroll },
        { to: '/society/notifications',  label: 'Notifications',  icon: Bell },
        { to: '/society/settings',       label: 'Settings',       icon: Settings },
      ],
    },
  ],

  resident: [
    {
      label: 'Home',
      items: [
        { to: '/resident/dashboard',  label: 'My Dashboard',   icon: LayoutDashboard },
        { to: '/resident/family',     label: 'Family Members', icon: Users },
        { to: '/resident/vehicles',   label: 'Vehicles',       icon: Car },
        { to: '/resident/pets',       label: 'Pets',           icon: PawPrint },
        { to: '/resident/daily-help', label: 'Daily Help',     icon: HandHelping },
      ],
    },
    {
      label: 'Society',
      items: [
        { to: '/resident/notices',     label: 'Notices',       icon: Megaphone },
        { to: '/resident/complaints',  label: 'Complaints',    icon: MessageSquareWarning },
        { to: '/resident/payments',    label: 'Payments',      icon: Wallet },
        { to: '/resident/maintenance', label: 'Maintenance',   icon: ReceiptText },
        { to: '/resident/statements',  label: 'Statements',    icon: FileText },
        { to: '/resident/sos',         label: 'SOS Emergency', icon: AlertTriangle },
      ],
    },
  ],

  accountant: [
    {
      label: 'Billing',
      items: [
        { to: '/accountant/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
        { to: '/accountant/dues',      label: 'Dues',           icon: AlertTriangle },
        { to: '/accountant/payments',  label: 'Payments',       icon: Wallet },
        { to: '/accountant/fund',      label: 'Fund Dashboard', icon: BarChart3 },
      ],
    },
    {
      label: 'Reports',
      items: [
        { to: '/accountant/expenses',   label: 'Expenses',   icon: ReceiptText },
        { to: '/accountant/statements', label: 'Statements', icon: FileText },
        { to: '/accountant/receipts',   label: 'Receipts',   icon: Receipt },
        { to: '/accountant/reports',    label: 'Reports',    icon: FileBarChart },
      ],
    },
  ],

  'security-guard': [
    {
      label: 'Gate',
      items: [
        { to: '/guard/dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
        { to: '/guard/visitor-entry',   label: 'Visitor Entry',    icon: UserCheck },
        { to: '/guard/approved',        label: 'Approved Visitors', icon: ClipboardCheck },
        { to: '/guard/delivery-verify', label: 'Delivery Verify',  icon: Truck },
        { to: '/guard/qr-verify',       label: 'QR Verify',        icon: QrCode },
        { to: '/guard/scanner',         label: 'Access Scanner',   icon: KeySquare },
      ],
    },
    {
      label: 'Logs & Alerts',
      items: [
        { to: '/guard/logs',    label: 'Entry / Exit Logs', icon: FileText },
        { to: '/guard/alerts',  label: 'Emergency Alerts',  icon: AlertTriangle },
        { to: '/guard/contact', label: 'Contact Resident',  icon: PhoneCall },
      ],
    },
  ],

  'maintenance-staff': [
    {
      label: 'Work',
      items: [
        { to: '/maintenance/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
        { to: '/maintenance/tasks',     label: 'Task Queue', icon: ListChecks },
        { to: '/maintenance/schedule',  label: 'Schedule',   icon: Calendar },
      ],
    },
    {
      label: 'Resources',
      items: [
        { to: '/maintenance/materials', label: 'Materials',    icon: Package },
        { to: '/maintenance/history',   label: 'Work History', icon: History },
      ],
    },
  ],

  'delivery-partner': [
    {
      label: 'Deliveries',
      items: [
        { to: '/delivery-partner/dashboard',          label: 'My Dashboard',      icon: LayoutDashboard },
        { to: '/delivery-partner/active-deliveries',  label: 'Active Deliveries', icon: Truck },
        { to: '/delivery-partner/delivery-history',   label: 'Delivery History',  icon: History },
      ],
    },
    {
      label: 'Access',
      items: [
        { to: '/delivery-partner/access-pass',  label: 'My Access Pass', icon: KeySquare },
        { to: '/delivery-partner/show-qr-code', label: 'Show QR Code',   icon: QrCode },
        { to: '/delivery-partner/entry-status', label: 'Entry Status',   icon: LogIn },
      ],
    },
  ],

  'guest-user': [
    {
      label: 'Access',
      items: [
        { to: '/guest-user/access-pass',  label: 'My Access Pass', icon: KeySquare },
        { to: '/guest-user/show-qr-code', label: 'Show QR Code',   icon: QrCode },
        { to: '/guest-user/entry-status', label: 'Entry Status',   icon: CheckCircle },
      ],
    },
  ],

  'support-staff': [
    {
      label: 'Support',
      items: [
        { to: '/support/dashboard',   label: 'Dashboard', icon: LayoutDashboard },
        { to: '/support/tickets',     label: 'Tickets',   icon: Ticket },
        { to: '/support/escalations', label: 'Escalations', icon: ArrowUpCircle },
      ],
    },
    {
      label: 'Records',
      items: [
        { to: '/support/history', label: 'Service History', icon: History },
      ],
    },
  ],
}
