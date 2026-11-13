import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh/', { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password/', data),
}

export const usersApi = {
  list: (params?: object) => api.get('/auth/users/', { params }),
  create: (data: object) => api.post('/auth/users/', data),
  update: (id: number, data: object) => api.patch(`/auth/users/${id}/`, data),
  delete: (id: number) => api.delete(`/auth/users/${id}/`),
  resetPassword: (id: number, data: { new_password: string }) =>
    api.post(`/auth/users/${id}/reset_password/`, data),
  toggleActive: (id: number) => api.post(`/auth/users/${id}/toggle_active/`),
}

export const currenciesApi = {
  list: () => api.get('/banks/currencies/'),
  create: (data: object) => api.post('/banks/currencies/', data),
  update: (id: number, data: object) => api.patch(`/banks/currencies/${id}/`, data),
  delete: (id: number) => api.delete(`/banks/currencies/${id}/`),
}

export const banksApi = {
  list: (params?: object) => api.get('/banks/', { params }),
  create: (data: object) => api.post('/banks/', data),
  update: (id: number, data: object) => api.patch(`/banks/${id}/`, data),
  delete: (id: number) => api.delete(`/banks/${id}/`),
}

export const bankAccountsApi = {
  list: (params?: object) => api.get('/banks/accounts/', { params }),
  create: (data: object) => api.post('/banks/accounts/', data),
  update: (id: number, data: object) => api.patch(`/banks/accounts/${id}/`, data),
  delete: (id: number) => api.delete(`/banks/accounts/${id}/`),
}

export const statementsApi = {
  list: (params?: object) => api.get('/statements/', { params }),
  upload: (formData: FormData) =>
    api.post('/statements/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/statements/${id}/`),
}

export const transactionsApi = {
  listByStatement: (statementId: number, params?: object) =>
    api.get(`/statements/${statementId}/transactions/`, { params }),
  list: (params?: object) => api.get('/statements/transactions/', { params }),
}

export const journalsApi = {
  list: (params?: object) => api.get('/accounting/journals/', { params }),
  create: (data: object) => api.post('/accounting/journals/', data),
  update: (id: number, data: object) => api.patch(`/accounting/journals/${id}/`, data),
  delete: (id: number) => api.delete(`/accounting/journals/${id}/`),
}

export const accountingEntriesApi = {
  list: (params?: object) => api.get('/accounting/entries/', { params }),
  import: (formData: FormData) =>
    api.post('/accounting/entries/import_file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/accounting/entries/${id}/`),
}

export const sessionsApi = {
  list: (params?: object) => api.get('/reconciliation/sessions/', { params }),
  create: (data: object) => api.post('/reconciliation/sessions/', data),
  get: (id: number) => api.get(`/reconciliation/sessions/${id}/`),
  update: (id: number, data: object) => api.patch(`/reconciliation/sessions/${id}/`, data),
  delete: (id: number) => api.delete(`/reconciliation/sessions/${id}/`),
  startMatching: (id: number) => api.post(`/reconciliation/sessions/${id}/start_matching/`),
  validate: (id: number) => api.post(`/reconciliation/sessions/${id}/validate/`),
  unmatchedTransactions: (id: number, params?: object) =>
    api.get(`/reconciliation/sessions/${id}/unmatched_transactions/`, { params }),
  unmatchedEntries: (id: number, params?: object) =>
    api.get(`/reconciliation/sessions/${id}/unmatched_entries/`, { params }),
  suggestMatches: (id: number, transactionId: number) =>
    api.get(`/reconciliation/sessions/${id}/suggest_matches/`, { params: { transaction_id: transactionId } }),
}

export const matchesApi = {
  list: (params?: object) => api.get('/reconciliation/matches/', { params }),
  create: (data: object) => api.post('/reconciliation/matches/', data),
  delete: (id: number) => api.delete(`/reconciliation/matches/${id}/`),
}

export const gapsApi = {
  list: (params?: object) => api.get('/reconciliation/gaps/', { params }),
  explain: (id: number, justification: string) =>
    api.post(`/reconciliation/gaps/${id}/explain/`, { justification }),
  resolve: (id: number, justification?: string) =>
    api.post(`/reconciliation/gaps/${id}/resolve/`, { justification }),
}

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard/'),
  reconciliation: (sessionId: number) => api.get(`/reports/reconciliation/${sessionId}/`),
}
