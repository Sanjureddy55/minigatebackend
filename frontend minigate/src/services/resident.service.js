import api from '../api/axios.js'

export const residentService = {
  // Dashboard
  getDashboard: () => api.get('/resident/dashboard/'),

  // My Flats
  getMyFlats: () => api.get('/resident/profile/my-flats/'),
  addFlat: (data) => api.post('/resident/profile/my-flats/', data),
  removeFlat: (id) => api.delete(`/resident/profile/my-flats/${id}/`),
  switchPrimaryFlat: (id) => api.post(`/resident/profile/my-flats/${id}/switch-primary/`),

  // Complaints
  getComplaints: (params) => api.get('/resident/complaints/', { params }),
  createComplaint: (data) => api.post('/resident/complaints/', data),
  updateComplaint: (id, data) => api.patch(`/resident/complaints/${id}/`, data),
  getComplaint: (id) => api.get(`/resident/complaints/${id}/`),

  // Notices
  getNotices: (params) => api.get('/resident/notices/', { params }),
  markNoticeRead: (id, residentId) => api.post(`/resident/notices/${id}/mark-read/`, { resident: residentId }),
  contributeToFundraiser: (id, data) => api.post(`/resident/notices/${id}/contribute/`, data),

  // Payments
  getPayments: (params) => api.get('/resident/payments/', { params }),

  // Visitors
  getVisitors: (params) => api.get('/resident/visitors/', { params }),
  createVisitor: (data) => api.post('/resident/visitors/', data),
  deleteVisitor: (id) => api.delete(`/resident/visitors/${id}/`),

  // Family Members
  getFamilyMembers: () => api.get('/resident/profile/family-members/'),
  createFamilyMember: (data) => api.post('/resident/profile/family-members/', data),
  updateFamilyMember: (id, data) => api.patch(`/resident/profile/family-members/${id}/`, data),
  deleteFamilyMember: (id) => api.delete(`/resident/profile/family-members/${id}/`),

  // Vehicles
  getVehicles: () => api.get('/resident/profile/vehicles/'),
  createVehicle: (data) => api.post('/resident/profile/vehicles/', data),
  updateVehicle: (id, data) => api.patch(`/resident/profile/vehicles/${id}/`, data),
  deleteVehicle: (id) => api.delete(`/resident/profile/vehicles/${id}/`),

  // Pets
  getPets: () => api.get('/resident/profile/pets/'),
  createPet: (data) => api.post('/resident/profile/pets/', data),
  deletePet: (id) => api.delete(`/resident/profile/pets/${id}/`),

  // Daily Help
  getDailyHelp: () => api.get('/resident/profile/daily-help/'),
  createDailyHelp: (data) => api.post('/resident/profile/daily-help/', data),
  deleteDailyHelp: (id) => api.delete(`/resident/profile/daily-help/${id}/`),

  // SOS
  getSos: () => api.get('/resident/sos/'),
  createSos: (data) => api.post('/resident/sos/', data),

  // Maintenance Transparency
  getMaintenanceTransparency: () => api.get('/resident/maintenance-transparency/'),

  // Monthly Statements
  getStatements: (params) => api.get('/resident/monthly-statements/', { params }),
  getStatement: (id) => api.get(`/resident/monthly-statements/${id}/`),
  downloadStatementPdf: (id) =>
    api.get(`/resident/monthly-statements/${id}/download-pdf/`, {
      responseType: 'blob',
    }),
}
