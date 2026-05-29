import api from '../api/axios.js'

export const platformService = {
  // Dashboard
  getDashboardStats: () => api.get('/platform-admin/dashboard/stats/'),
  getDashboardSocieties: (params) =>
    api.get('/platform-admin/dashboard/societies/', { params }),

  // Societies
  getSocieties: (params) => api.get('/platform-admin/society-management/', { params }),
  getSociety: (id) => api.get(`/platform-admin/society-management/${id}/`),
  createSociety: (data) => api.post('/platform-admin/society-management/', data),
  updateSociety: (id, data) => api.patch(`/platform-admin/society-management/${id}/`, data),
  deleteSociety: (id) => api.delete(`/platform-admin/society-management/${id}/`),

  // Onboarding helpers
  getCities: () => api.get('/accounts/onboarding/cities/'),
  getBuildings: (societyId) => api.get('/accounts/onboarding/buildings/', { params: { society: societyId } }),
  getFlats: (societyId, buildingId) => api.get('/accounts/onboarding/flats/', { params: { society: societyId, building: buildingId } }),

  // Subscription Plans
  getPlans: (params) => api.get('/platform-admin/subscription-plans/', { params }),
  getPlan: (id) => api.get(`/platform-admin/subscription-plans/${id}/`),
  createPlan: (data) => api.post('/platform-admin/subscription-plans/', data),
  updatePlan: (id, data) => api.patch(`/platform-admin/subscription-plans/${id}/`, data),
  deletePlan: (id) => api.delete(`/platform-admin/subscription-plans/${id}/`),

  // Global Users
  getGlobalUsers: (params) => api.get('/platform-admin/global-users/', { params }),
  getUserStats: () => api.get('/platform-admin/global-users/stats/'),
  inviteUser: (data) => api.post('/platform-admin/global-users/invite/', data),

  // Roles
  getRoles: () => api.get('/roles-permissions/roles/'),

  // Reports
  getReportsDashboard: () => api.get('/platform-admin/global-reports/dashboard/'),
  getReportsOverview: (params) => api.get('/platform-admin/global-reports/overview/', { params }),
  getRevenueReport: (params) => api.get('/platform-admin/global-reports/revenue/', { params }),
  getSocietyGrowth: (params) => api.get('/platform-admin/global-reports/society-growth/', { params }),
  getUserGrowth: (params) => api.get('/platform-admin/global-reports/user-growth/', { params }),
  getComplaintsReport: (params) => api.get('/platform-admin/global-reports/complaints/', { params }),
  getVisitorReport: (params) => api.get('/platform-admin/global-reports/visitors/', { params }),

  // Audit Logs
  getAuditLogs: (params) => api.get('/platform-admin/audit-logs/', { params }),
  getAuditSummary: () => api.get('/platform-admin/audit-logs/summary/'),
  exportAuditLogs: (params) =>
    api.get('/platform-admin/audit-logs/export/', { params, responseType: 'blob' }),

  // Society Admins
  getSocietyAdmins: (params) => api.get('/platform-admin/society-admins/', { params }),
  getSocietyAdminStats: () => api.get('/platform-admin/society-admins/stats/'),
  getSocietyAdmin: (id) => api.get(`/platform-admin/society-admins/${id}/`),
  updateSocietyAdmin: (id, data) => api.patch(`/platform-admin/society-admins/${id}/`, data),
  approveSocietyAdmin: (id) => api.post(`/platform-admin/society-admins/${id}/approve/`),
  suspendSocietyAdmin: (id) => api.post(`/platform-admin/society-admins/${id}/suspend/`),
  inviteSocietyAdmin: (data) => api.post('/platform-admin/society-admins/invite/', data),

  // System Settings
  getSystemSettings: () => api.get('/platform-admin/system-settings/'),
  updateSystemSettings: (data) => api.patch('/platform-admin/system-settings/', data),
}
