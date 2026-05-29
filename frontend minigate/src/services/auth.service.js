import api from '../api/axios.js'

export const authService = {
  sendOtp: (mobile) => api.post('/accounts/otp/send/', { mobile }),

  verifyOtp: (mobile, otp_code) => api.post('/accounts/otp/verify/', { mobile, otp_code }),

  loginMobile: (mobile, otp_code) =>
    api.post('/accounts/login/mobile/', { mobile, otp_code }),

  loginEmail: (email, password) =>
    api.post('/accounts/login/email/', { email, password }),

  refreshToken: (refresh) => api.post('/accounts/token/refresh/', { refresh }),

  getMe: () => api.get('/accounts/me/'),

  getMyHome: (mobile) => api.get('/accounts/my-home/', { params: { mobile } }),

  getApprovalStatus: (mobile) =>
    api.get('/accounts/onboarding/approval-status/', { params: { mobile } }),

  // Onboarding lookups
  getCountries: () => api.get('/accounts/onboarding/countries/'),
  getCities: (country) => api.get('/accounts/onboarding/cities/', { params: { country } }),
  getSocieties: (city) => api.get('/accounts/onboarding/societies/', { params: { city } }),
  getBuildings: (society) => api.get('/accounts/onboarding/buildings/', { params: { society } }),
  getFlats: (society, building) =>
    api.get('/accounts/onboarding/flats/', { params: { society, building } }),

  completeOnboarding: (data) => api.post('/accounts/onboarding/complete/', data),
}
