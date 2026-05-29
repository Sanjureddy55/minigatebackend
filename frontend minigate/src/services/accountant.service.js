import api from '../api/axios.js'

export const accountantService = {
  // Dashboard
  getDashboard: (societyId) =>
    api.get('/accountant/dashboard/', { params: { society: societyId } }),

  // Dues
  getDues: (params) => api.get('/accountant/payment-collection/dues/', { params }),
  getDue: (id) => api.get(`/accountant/payment-collection/dues/${id}/`),
  createDue: (data) => api.post('/accountant/payment-collection/dues/', data),
  updateDue: (id, data) => api.patch(`/accountant/payment-collection/dues/${id}/`, data),
  deleteDue: (id) => api.delete(`/accountant/payment-collection/dues/${id}/`),
  markDuePaid: (id, data) =>
    api.post(`/accountant/payment-collection/dues/${id}/mark-paid/`, data),
  generateDues: (data) => api.post('/accountant/payment-collection/dues/generate/', data),

  // Payments
  getPayments: (params) =>
    api.get('/accountant/payment-collection/payments/', { params }),
  getPayment: (id) => api.get(`/accountant/payment-collection/payments/${id}/`),
  createPayment: (data) => api.post('/accountant/payment-collection/payments/', data),
  updatePayment: (id, data) =>
    api.patch(`/accountant/payment-collection/payments/${id}/`, data),
  deletePayment: (id) => api.delete(`/accountant/payment-collection/payments/${id}/`),

  // Pending Dues (Defaulters)
  getPendingDues: (params) =>
    api.get('/accountant/track-payments/pending-dues/', { params }),
  getPendingDuesSummary: () =>
    api.get('/accountant/track-payments/pending-dues/summary/'),
  sendReminders: (data) =>
    api.post('/accountant/track-payments/pending-dues/send-reminders/', data),

  // Track Payments
  getTrackPayments: (params) => api.get('/accountant/track-payments/', { params }),
  getTrackPaymentsSummary: () => api.get('/accountant/track-payments/summary/'),
  getTrackPayment: (id) => api.get(`/accountant/track-payments/${id}/`),
  exportTrackPayments: () =>
    api.get('/accountant/track-payments/export/', { responseType: 'blob' }),

  // Fund Dashboard
  getFundDashboard: (societyId) =>
    api.get('/accountant/fund-dashboard/', { params: { society: societyId } }),

  // Maintenance Expenses
  getExpenses: (params) => api.get('/accountant/maintenance-expenses/', { params }),
  getExpense: (id) => api.get(`/accountant/maintenance-expenses/${id}/`),
  getExpensesSummary: () => api.get('/accountant/maintenance-expenses/summary/'),
  createExpense: (data) => api.post('/accountant/maintenance-expenses/', data),
  updateExpense: (id, data) =>
    api.patch(`/accountant/maintenance-expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/accountant/maintenance-expenses/${id}/`),
  publishExpense: (id) => api.post(`/accountant/maintenance-expenses/${id}/publish/`),
  unpublishExpense: (id) => api.post(`/accountant/maintenance-expenses/${id}/unpublish/`),

  // Monthly Statements
  getStatements: (params) => api.get('/accountant/monthly-statements/', { params }),
  getStatement: (id) => api.get(`/accountant/monthly-statements/${id}/`),
  generateStatement: (data) =>
    api.post('/accountant/monthly-statements/generate/', data),
  updateStatement: (id, data) =>
    api.patch(`/accountant/monthly-statements/${id}/`, data),
  publishStatement: (id) => api.post(`/accountant/monthly-statements/${id}/publish/`),
  unpublishStatement: (id) =>
    api.post(`/accountant/monthly-statements/${id}/unpublish/`),
  downloadStatementPdf: (id) =>
    api.get(`/accountant/monthly-statements/${id}/download-pdf/`, {
      responseType: 'blob',
    }),
  exportStatementExcel: (id) =>
    api.get(`/accountant/monthly-statements/${id}/export-excel/`, {
      responseType: 'blob',
    }),

  // Receipts
  getReceipts: (params) => api.get('/accountant/generate-receipts/', { params }),
  getReceipt: (id) => api.get(`/accountant/generate-receipts/${id}/`),
  downloadReceiptPdf: (id) =>
    api.get(`/accountant/generate-receipts/${id}/pdf/`, { responseType: 'blob' }),
  downloadBulkPdf: (params) =>
    api.get('/accountant/generate-receipts/bulk-pdf/', { params, responseType: 'blob' }),
  downloadBulkCsv: (params) =>
    api.get('/accountant/generate-receipts/bulk-csv/', { params, responseType: 'blob' }),

  // Payment Reports
  getPaymentReports: (params) => api.get('/accountant/payment-reports/', { params }),
  downloadPaymentReportPdf: (params) =>
    api.get('/accountant/payment-reports/download-pdf/', { params, responseType: 'blob' }),

  // Export Reports
  exportPaymentsCsv: (params) =>
    api.get('/accountant/export-reports/payments/', { params, responseType: 'blob' }),
  exportPaymentsPdf: (params) =>
    api.get('/accountant/export-reports/payments/pdf/', { params, responseType: 'blob' }),
  exportTallyXml: (params) =>
    api.get('/accountant/export-reports/payments/tally/', { params, responseType: 'blob' }),
  exportDuesCsv: (params) =>
    api.get('/accountant/export-reports/dues/', { params, responseType: 'blob' }),
  exportExpensesCsv: (params) =>
    api.get('/accountant/export-reports/expenses/', { params, responseType: 'blob' }),
  exportStatementsCsv: (params) =>
    api.get('/accountant/export-reports/statements/', { params, responseType: 'blob' }),
}
