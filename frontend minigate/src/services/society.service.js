import api from '../api/axios.js'

export const societyService = {
  // Dashboard
  getDashboard: (societyId) =>
    api.get('/society-admin/dashboard/', { params: { society: societyId } }),

  // Buildings
  getBuildings:          (params) => api.get('/society-admin/buildings/', { params }),
  getBuildingDashboard:  ()       => api.get('/society-admin/buildings/dashboard/'),
  getBuilding:           (id)     => api.get(`/society-admin/buildings/${id}/`),
  createBuilding:        (data)   => api.post('/society-admin/buildings/', data),
  updateBuilding:        (id, data) => api.patch(`/society-admin/buildings/${id}/`, data),
  deleteBuilding:        (id)     => api.delete(`/society-admin/buildings/${id}/`),
  getBuildingFloors:     (id)     => api.get(`/society-admin/buildings/${id}/floors/`),

  // Flats
  getFlats: (params) => api.get('/society-admin/flats/', { params }),
  createFlat: (data) => api.post('/society-admin/flats/', data),
  updateFlat: (id, data) => api.patch(`/society-admin/flats/${id}/`, data),
  deleteFlat: (id) => api.delete(`/society-admin/flats/${id}/`),

  // Residents
  getResidents:      (params) => api.get('/society-admin/residents/', { params }),
  getResidentStats:  ()       => api.get('/society-admin/residents/dashboard/'),
  getPendingResidents: ()     => api.get('/society-admin/residents/pending/'),
  getResident:       (id)     => api.get(`/society-admin/residents/${id}/`),
  addResident:       (data)   => api.post('/society-admin/residents/add/', data),
  approveResident2:  (id, data) => api.post(`/society-admin/residents/${id}/approve/`, data ?? {}),
  rejectResident2:   (id, reason) => api.post(`/society-admin/residents/${id}/reject/`, { reason }),
  deactivateResident: (id)    => api.post(`/society-admin/residents/${id}/deactivate/`),
  reactivateResident: (id)    => api.post(`/society-admin/residents/${id}/reactivate/`),

  // Approvals
  getApprovals:      (params)     => api.get('/society-admin/approvals/', { params }),
  getApproval:       (id)         => api.get(`/society-admin/approvals/${id}/`),
  getApprovalKpi:    ()           => api.get('/society-admin/approvals/kpi/'),
  createApproval:    (data)       => api.post('/society-admin/approvals/', data),
  updateApproval:    (id, data)   => api.patch(`/society-admin/approvals/${id}/`, data),
  approveApproval:   (id, data)   => api.post(`/society-admin/approvals/${id}/approve/`, data ?? {}),
  rejectApproval2:   (id, reason) => api.post(`/society-admin/approvals/${id}/reject/`, { reason }),
  updateProgress:    (id, progress) => api.patch(`/society-admin/approvals/${id}/progress/`, { progress }),
  approveResident: (id) => api.post(`/society-admin/approvals/${id}/approve/`),
  rejectResident: (id, reason) =>
    api.post(`/society-admin/approvals/${id}/reject/`, { reason }),

  // Notice Board
  getNotices: (params) => api.get('/society-admin/notice-board/', { params }),
  getNoticeDashboard: (params) => api.get('/society-admin/notice-board/dashboard/', { params }),
  getNotice: (id) => api.get(`/society-admin/notice-board/${id}/`),
  createNotice: (data) => api.post('/society-admin/notice-board/', data),
  updateNotice: (id, data) => api.patch(`/society-admin/notice-board/${id}/`, data),
  deleteNotice: (id) => api.delete(`/society-admin/notice-board/${id}/`),

  // Complaints
  getComplaints: (params) => api.get('/society-admin/complaints/', { params }),
  updateComplaint: (id, data) => api.patch(`/society-admin/complaints/${id}/`, data),
  getComplaintStats: (params) =>
    api.get('/society-admin/complaints/stats/', { params }),

  // Staff & Guards
  getStaffGuards: (params) => api.get('/society-admin/staff-guards/', { params }),

  // Vendors
  getVendors: (params) => api.get('/society-admin/vendors/', { params }),
  createVendor: (data) => api.post('/society-admin/vendors/', data),
  updateVendor: (id, data) => api.patch(`/society-admin/vendors/${id}/`, data),
  deleteVendor: (id) => api.delete(`/society-admin/vendors/${id}/`),
  getVendorKpi: (params) => api.get('/society-admin/vendors/kpi/', { params }),

  // Payments
  getPayments: (params) => api.get('/society-admin/payments/', { params }),
  getPaymentsOverview: (params) =>
    api.get('/society-admin/payments/overview/', { params }),

  // Fund Dashboard
  getFundDashboard: (params) =>
    api.get('/society-admin/fund-dashboard/', { params }),

  // Maintenance Expenses
  getExpenses: (params) =>
    api.get('/society-admin/maintenance-expenses/', { params }),
  createExpense: (data) => {
    if (data instanceof FormData) {
      return api.post('/society-admin/maintenance-expenses/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/society-admin/maintenance-expenses/', data)
  },
  updateExpense: (id, data) =>
    api.patch(`/society-admin/maintenance-expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/society-admin/maintenance-expenses/${id}/`),
  getExpenseSummary: (params) =>
    api.get('/society-admin/maintenance-expenses/summary/', { params }),

  // Monthly Statements
  getStatements: (params) =>
    api.get('/society-admin/monthly-statements/', { params }),
  getStatement: (id) =>
    api.get(`/society-admin/monthly-statements/${id}/`),
  downloadStatementPdf: (id) =>
    api.get(`/society-admin/monthly-statements/${id}/download-pdf/`, {
      responseType: 'blob',
    }),
  exportStatementExcel: (id) =>
    api.get(`/society-admin/monthly-statements/${id}/export-excel/`, {
      responseType: 'blob',
    }),

  // Analytics
  getAnalytics: (societyId) =>
    api.get('/society-admin/analytics/', { params: { society: societyId } }),

  // Audit Logs
  getAuditLogs: (params) => api.get('/society-admin/audit-logs/', { params }),
  exportAuditLogs: (params) =>
    api.get('/society-admin/audit-logs/export/', { params, responseType: 'blob' }),

  // Visitors
  getVisitors:          (params) => api.get('/society-admin/visitors/', { params }),
  getVisitorDashboard:  ()       => api.get('/society-admin/visitors/dashboard/'),
  getVisitor:           (id)     => api.get(`/society-admin/visitors/${id}/`),
  registerVisitor:      (data)   => api.post('/society-admin/visitors/register/', data),
  updateVisitor:        (id, data) => api.patch(`/society-admin/visitors/${id}/`, data),
  approveVisitor:       (id, notes) => api.post(`/society-admin/visitors/${id}/approve/`, notes ? { notes } : {}),
  rejectVisitor:        (id, reason) => api.post(`/society-admin/visitors/${id}/reject/`, { reason }),
  checkInVisitor:       (id)     => api.post(`/society-admin/visitors/${id}/check-in/`, {}),
  checkOutVisitor:      (id)     => api.post(`/society-admin/visitors/${id}/check-out/`, {}),

  // Security — Dashboard
  getSecurityDashboard: ()           => api.get('/society-admin/security/dashboard/'),
  // Security — Gates
  getGates:    (params)              => api.get('/society-admin/security/gates/', { params }),
  createGate:  (data)                => api.post('/society-admin/security/gates/', data),
  openGate:    (id)                  => api.post(`/society-admin/security/gates/${id}/open/`),
  closeGate:   (id)                  => api.post(`/society-admin/security/gates/${id}/close/`),
  // Security — Alerts
  getAlerts:         (params)        => api.get('/society-admin/security/alerts/', { params }),
  createAlert:       (data)          => api.post('/society-admin/security/alerts/', data),
  acknowledgeAlert:  (id)            => api.post(`/society-admin/security/alerts/${id}/acknowledge/`),
  resolveAlert:      (id)            => api.post(`/society-admin/security/alerts/${id}/resolve/`),
  // Security — Guard Roster
  getGuardRoster:    (params)        => api.get('/society-admin/security/guard-roster/', { params }),
  scheduleShift:     (data)          => api.post('/society-admin/security/guard-roster/', data),

  // Notifications
  getNotifications: (params) => api.get('/society-admin/notifications/', { params }),

  // Roles & Access
  getRoles: (params) => api.get('/society-admin/roles-access/', { params }),
  getRoleDashboard: (params) => api.get('/society-admin/roles-access/dashboard/', { params }),
  getAvailableModules: () => api.get('/society-admin/roles-access/available-modules/'),
  createRole: (data) => api.post('/society-admin/roles-access/', data),
  updateRole: (id, data) => api.patch(`/society-admin/roles-access/${id}/`, data),
  deleteRole: (id) => api.delete(`/society-admin/roles-access/${id}/`),
  assignUser: (roleId, data) =>
    api.post(`/society-admin/roles-access/${roleId}/assign-user/`, data),

  // Settings
  getSettings: (societyId) =>
    api.get('/society-admin/settings/', { params: { society: societyId } }),
  updateSettings: (societyId, data) =>
    api.patch('/society-admin/settings/', data, { params: { society: societyId } }),
}
