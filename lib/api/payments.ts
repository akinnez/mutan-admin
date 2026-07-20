import api from './client'

export const paymentsApi = {
  pendingCount: () => api.get('/admin/payments/pending-count'),
  list: (params?: Record<string, any>) => api.get('/admin/payments', { params }),
  approve: (id: string, data: { verified_amount: number; note?: string }) =>
    api.post(`/admin/payments/${id}/approve`, data),
  reject: (id: string, data: { rejection_reason: string }) =>
    api.patch(`/admin/payments/${id}/reject`, data),
  bulkApprove: (ids: string[]) => api.post('/admin/payments/bulk-approve', { ids }),
}
