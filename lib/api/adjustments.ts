import api from './client'

export type AdjustmentAction =
  | 'wallet_credit'
  | 'wallet_debit'
  | 'loan_reduce_balance'
  | 'loan_increase_balance'

export const adjustmentsApi = {
  pendingCount: () => api.get('/admin/adjustments/pending-count'),
  list: (params?: { status?: string; member_id?: string }) =>
    api.get('/admin/adjustments', { params }),
  getMemberAccounts: (memberId: string) =>
    api.get(`/admin/adjustments/member/${memberId}/accounts`),
  create: (data: {
    member_id: string
    action: AdjustmentAction
    wallet_id?: string
    loan_id?: string
    amount: number
    reason: string
    month_label?: string
    related_reference?: string
  }) => api.post('/admin/adjustments', data),
  confirm: (id: string) => api.post(`/admin/adjustments/${id}/confirm`),
  reject: (id: string, reason: string) =>
    api.patch(`/admin/adjustments/${id}/reject`, { reason }),
}
