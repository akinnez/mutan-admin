import api from './client'

export const loansApi = {
  summary: () => api.get('/admin/loans/summary'),
  list: (params?: Record<string, any>) => api.get('/admin/loans', { params }),
  getOne: (id: string) => api.get(`/admin/loans/${id}`),
  // multipart — expects a FormData with member_id, guarantor_member_ids
  // (JSON string), principal_amount, monthly_repayment, due_date, purpose,
  // and the loan_document file.
  create: (formData: FormData) => api.post('/admin/loans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  approve: (id: string) => api.post(`/admin/loans/${id}/approve`),
  reject: (id: string, reason: string) => api.patch(`/admin/loans/${id}/reject`, { reason }),
  update: (id: string, data: Record<string, any>) => api.patch(`/admin/loans/${id}`, data),
  restructure: (id: string, data: { new_monthly_repayment: number; reason: string }) =>
    api.patch(`/admin/loans/${id}/restructure`, data),
  purgeEligible: () => api.get('/admin/loans/purge-eligible'),
  purgeDocument: (id: string) => api.post(`/admin/loans/${id}/purge-document`),
}
