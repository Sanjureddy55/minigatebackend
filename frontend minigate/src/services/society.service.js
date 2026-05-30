import api from '../api/axios.js'

export const societyService = {

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: (params) => api.get('/society-admin/dashboard/', { params }),

  // ── Buildings ──────────────────────────────────────────────────────────────
  getBuildings:         (params)      => api.get('/society-admin/buildings/', { params }),
  getBuildingDashboard: ()            => api.get('/society-admin/buildings/dashboard/'),
  getBuilding:          (id)          => api.get(`/society-admin/buildings/${id}/`),
  createBuilding:       (data)        => api.post('/society-admin/buildings/', data),
  updateBuilding:       (id, data)    => api.patch(`/society-admin/buildings/${id}/`, data),
  deleteBuilding:       (id)          => api.delete(`/society-admin/buildings/${id}/`),
  getBuildingFloors:    (id)          => api.get(`/society-admin/buildings/${id}/floors/`),

  // ── Flats ──────────────────────────────────────────────────────────────────
  getFlats:         (params)      => api.get('/society-admin/flats/', { params }),
  getFlatDashboard: ()            => api.get('/society-admin/flats/dashboard/'),
  getFlat:          (id)          => api.get(`/society-admin/flats/${id}/`),
  addFlat:          (data)        => api.post('/society-admin/flats/add/', data),
  bulkAddFlats:     (data)        => api.post('/society-admin/flats/bulk-add/', data),
  updateFlat:       (id, data)    => api.patch(`/society-admin/flats/${id}/`, data),
  deleteFlat:       (id)          => api.delete(`/society-admin/flats/${id}/`),

  // ── Residents ──────────────────────────────────────────────────────────────
  getResidents:        (params)        => api.get('/society-admin/residents/', { params }),
  getResidentStats:    ()              => api.get('/society-admin/residents/dashboard/'),
  getPendingResidents: ()              => api.get('/society-admin/residents/pending/'),
  getResident:         (id)            => api.get(`/society-admin/residents/${id}/`),
  addResident:         (data)          => api.post('/society-admin/residents/add/', data),
  approveResident:     (id, data)      => api.post(`/society-admin/residents/${id}/approve/`, data ?? {}),
  rejectResident:      (id, reason)    => api.post(`/society-admin/residents/${id}/reject/`, { reason }),
  deactivateResident:  (id)            => api.post(`/society-admin/residents/${id}/deactivate/`),
  reactivateResident:  (id)            => api.post(`/society-admin/residents/${id}/reactivate/`),

  // ── Visitors ───────────────────────────────────────────────────────────────
  getVisitors:         (params)        => api.get('/society-admin/visitors/', { params }),
  getVisitorDashboard: ()              => api.get('/society-admin/visitors/dashboard/'),
  getVisitor:          (id)            => api.get(`/society-admin/visitors/${id}/`),
  registerVisitor:     (data)          => api.post('/society-admin/visitors/register/', data),
  updateVisitor:       (id, data)      => api.patch(`/society-admin/visitors/${id}/`, data),
  approveVisitor:      (id, notes)     => api.post(`/society-admin/visitors/${id}/approve/`, notes ? { notes } : {}),
  rejectVisitor:       (id, reason)    => api.post(`/society-admin/visitors/${id}/reject/`, { reason }),
  checkInVisitor:      (id)            => api.post(`/society-admin/visitors/${id}/check-in/`, {}),
  checkOutVisitor:     (id)            => api.post(`/society-admin/visitors/${id}/check-out/`, {}),

  // ── Approvals ──────────────────────────────────────────────────────────────
  getApprovals:      (params)          => api.get('/society-admin/approvals/', { params }),
  getApproval:       (id)              => api.get(`/society-admin/approvals/${id}/`),
  getApprovalKpi:    ()                => api.get('/society-admin/approvals/kpi/'),
  createApproval:    (data)            => api.post('/society-admin/approvals/', data),
  updateApproval:    (id, data)        => api.patch(`/society-admin/approvals/${id}/`, data),
  approveApproval:   (id, data)        => api.post(`/society-admin/approvals/${id}/approve/`, data ?? {}),
  rejectApproval:    (id, reason)      => api.post(`/society-admin/approvals/${id}/reject/`, { reason }),
  updateProgress:    (id, progress)    => api.patch(`/society-admin/approvals/${id}/progress/`, { progress }),
  deleteApproval:    (id)              => api.delete(`/society-admin/approvals/${id}/`),

  // ── Security — Dashboard ───────────────────────────────────────────────────
  getSecurityDashboard: () => api.get('/society-admin/security/dashboard/'),

  // ── Security — Gates ───────────────────────────────────────────────────────
  getGates:    (params)   => api.get('/society-admin/security/gates/', { params }),
  getGate:     (id)       => api.get(`/society-admin/security/gates/${id}/`),
  createGate:  (data)     => api.post('/society-admin/security/gates/', data),
  updateGate:  (id, data) => api.patch(`/society-admin/security/gates/${id}/`, data),
  deleteGate:  (id)       => api.delete(`/society-admin/security/gates/${id}/`),
  openGate:    (id)       => api.post(`/society-admin/security/gates/${id}/open/`),
  closeGate:   (id)       => api.post(`/society-admin/security/gates/${id}/close/`),

  // ── Security — Alerts ──────────────────────────────────────────────────────
  getAlerts:        (params)      => api.get('/society-admin/security/alerts/', { params }),
  getAlert:         (id)          => api.get(`/society-admin/security/alerts/${id}/`),
  createAlert:      (data)        => api.post('/society-admin/security/alerts/', data),
  updateAlert:      (id, data)    => api.patch(`/society-admin/security/alerts/${id}/`, data),
  deleteAlert:      (id)          => api.delete(`/society-admin/security/alerts/${id}/`),
  acknowledgeAlert: (id)          => api.post(`/society-admin/security/alerts/${id}/acknowledge/`),
  resolveAlert:     (id)          => api.post(`/society-admin/security/alerts/${id}/resolve/`),

  // ── Security — Guard Roster ────────────────────────────────────────────────
  getGuardRoster: (params) => api.get('/society-admin/security/guard-roster/', { params }),
  scheduleShift:  (data)   => api.post('/society-admin/security/guard-roster/', data),

  // ── Staff Guards (roster management) ──────────────────────────────────────
  getStaffGuards:    (params)      => api.get('/society-admin/staff-guards/', { params }),
  getStaffGuardsKpi: ()            => api.get('/society-admin/staff-guards/kpi/'),
  getStaffGuard:     (id)          => api.get(`/society-admin/staff-guards/${id}/`),
  createStaffGuard:  (data)        => api.post('/society-admin/staff-guards/', data),
  updateStaffGuard:  (id, data)    => api.patch(`/society-admin/staff-guards/${id}/`, data),
  deleteStaffGuard:  (id)          => api.delete(`/society-admin/staff-guards/${id}/`),

  // ── Staff Accounts ─────────────────────────────────────────────────────────
  getStaffAccounts:   (params)      => api.get('/society-admin/staff-accounts/', { params }),
  getStaffKpi:        ()            => api.get('/society-admin/staff-accounts/kpi/'),
  getStaffRoles:      ()            => api.get('/society-admin/staff-accounts/roles/'),
  getStaffAccount:    (id)          => api.get(`/society-admin/staff-accounts/${id}/`),
  createStaffAccount: (data)        => api.post('/society-admin/staff-accounts/', data),
  updateStaffAccount: (id, data)    => api.patch(`/society-admin/staff-accounts/${id}/`, data),
  deactivateStaff:    (id)          => api.post(`/society-admin/staff-accounts/${id}/deactivate/`),
  reactivateStaff:    (id)          => api.post(`/society-admin/staff-accounts/${id}/reactivate/`),

  // ── Complaints ─────────────────────────────────────────────────────────────
  getComplaints:           (params)      => api.get('/society-admin/complaints/', { params }),
  getComplaint:            (id)          => api.get(`/society-admin/complaints/${id}/`),
  getComplaintStats:       ()            => api.get('/society-admin/complaints/stats/'),
  logComplaint:            (data)        => api.post('/society-admin/complaints/log/', data),
  updateComplaint:         (id, data)    => api.patch(`/society-admin/complaints/${id}/`, data),
  assignComplaint:         (id, data)    => api.post(`/society-admin/complaints/${id}/assign/`, data),
  moveComplaintInProgress: (id)          => api.post(`/society-admin/complaints/${id}/in-progress/`),
  resolveComplaint:        (id, data)    => api.post(`/society-admin/complaints/${id}/resolve/`, data ?? {}),
  closeComplaint:          (id)          => api.post(`/society-admin/complaints/${id}/close/`),

  // ── Notice Board ───────────────────────────────────────────────────────────
  getNotices:         (params)     => api.get('/society-admin/notice-board/', { params }),
  getNoticeDashboard: (params)     => api.get('/society-admin/notice-board/dashboard/', { params }),
  getNotice:          (id)         => api.get(`/society-admin/notice-board/${id}/`),
  createNotice:       (data)       => {
    if (data instanceof FormData) {
      return api.post('/society-admin/notice-board/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/society-admin/notice-board/', data)
  },
  updateNotice:       (id, data)   => api.patch(`/society-admin/notice-board/${id}/`, data),
  deleteNotice:       (id)         => api.delete(`/society-admin/notice-board/${id}/`),

  // ── Payments ───────────────────────────────────────────────────────────────
  getPaymentsOverview: (params) => api.get('/society-admin/payments/overview/', { params }),
  generateDues:        (data)   => api.post('/society-admin/payments/generate/', data),
  updateDueStatus:     (id, data) => api.patch(`/society-admin/payments/dues/${id}/`, data),

  // ── Fund Dashboard ─────────────────────────────────────────────────────────
  getFundDashboard: (params) => api.get('/society-admin/fund-dashboard/', { params }),

  // ── Maintenance Expenses ───────────────────────────────────────────────────
  getExpenses:      (params)   => api.get('/society-admin/maintenance-expenses/', { params }),
  getExpense:       (id)       => api.get(`/society-admin/maintenance-expenses/${id}/`),
  getExpenseSummary: (params)  => api.get('/society-admin/maintenance-expenses/summary/', { params }),
  createExpense:    (data)     => {
    if (data instanceof FormData) {
      return api.post('/society-admin/maintenance-expenses/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/society-admin/maintenance-expenses/', data)
  },
  updateExpense:    (id, data) => api.patch(`/society-admin/maintenance-expenses/${id}/`, data),
  deleteExpense:    (id)       => api.delete(`/society-admin/maintenance-expenses/${id}/`),
  publishExpense:   (id)       => api.post(`/society-admin/maintenance-expenses/${id}/publish/`),
  unpublishExpense: (id)       => api.post(`/society-admin/maintenance-expenses/${id}/unpublish/`),

  // ── Monthly Statements ─────────────────────────────────────────────────────
  getStatements:         (params) => api.get('/society-admin/monthly-statements/', { params }),
  getStatement:          (id)     => api.get(`/society-admin/monthly-statements/${id}/`),
  generateStatement:     (data)   => api.post('/society-admin/monthly-statements/generate/', data),
  publishStatement:      (id)     => api.post(`/society-admin/monthly-statements/${id}/publish/`),
  unpublishStatement:    (id)     => api.post(`/society-admin/monthly-statements/${id}/unpublish/`),
  uploadStatementProof:  (id, fd) => api.post(`/society-admin/monthly-statements/${id}/upload-proof/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteStatementProof:  (id, docId) => api.delete(`/society-admin/monthly-statements/${id}/delete-proof/?doc_id=${docId}`),
  downloadStatementPdf:  (id)     => api.get(`/society-admin/monthly-statements/${id}/download-pdf/`, { responseType: 'blob' }),
  exportStatementExcel:  (id)     => api.get(`/society-admin/monthly-statements/${id}/export-excel/`, { responseType: 'blob' }),

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications:     (params) => api.get('/society-admin/notifications/', { params }),
  getNotificationStats: ()       => api.get('/society-admin/notifications/stats/'),
  markNotificationRead: (id)     => api.post(`/society-admin/notifications/${id}/mark-read/`),
  markAllRead:          ()       => api.post('/society-admin/notifications/mark-all-read/'),

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics: (params) => api.get('/society-admin/analytics/', { params }),

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  getAuditLogs:    (params) => api.get('/society-admin/audit-logs/', { params }),
  exportAuditLogs: (params) => api.get('/society-admin/audit-logs/export/', { params, responseType: 'blob' }),

  // ── Roles & Access ─────────────────────────────────────────────────────────
  getRoles:            (params)       => api.get('/society-admin/roles-access/', { params }),
  getRole:             (id)           => api.get(`/society-admin/roles-access/${id}/`),
  getRoleDashboard:    (params)       => api.get('/society-admin/roles-access/dashboard/', { params }),
  getAvailableModules: ()             => api.get('/society-admin/roles-access/available-modules/'),
  getRoleUsers:        (params)       => api.get('/society-admin/roles-access/users/', { params }),
  createRole:          (data)         => api.post('/society-admin/roles-access/', data),
  updateRole:          (id, data)     => api.patch(`/society-admin/roles-access/${id}/`, data),
  deleteRole:          (id)           => api.delete(`/society-admin/roles-access/${id}/`),
  assignUser:          (roleId, data) => api.post(`/society-admin/roles-access/${roleId}/assign-user/`, data),
  toggleRoleActive:    (id)           => api.post(`/society-admin/roles-access/${id}/toggle-active/`),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings:    (params) => api.get('/society-admin/settings/', { params }),
  updateSettings: (data, params) => api.patch('/society-admin/settings/', data, { params }),

  // ── Vendors ────────────────────────────────────────────────────────────────
  getVendors:   (params)      => api.get('/society-admin/vendors/', { params }),
  getVendor:    (id)          => api.get(`/society-admin/vendors/${id}/`),
  getVendorKpi: (params)      => api.get('/society-admin/vendors/kpi/', { params }),
  createVendor: (data)        => api.post('/society-admin/vendors/', data),
  updateVendor: (id, data)    => api.patch(`/society-admin/vendors/${id}/`, data),
  deleteVendor: (id)          => api.delete(`/society-admin/vendors/${id}/`),
}
