import api from './client'

export const ledgerApi = {
  accounts: () => api.get('/admin/coop-ledger/accounts'),
  list: (params?: { from_date?: string; to_date?: string; account_id?: string }) =>
    api.get('/admin/coop-ledger', { params }),
  create: (data: {
    account_id: string
    type: 'debit' | 'credit'
    amount: number
    board_resolution_reference: string
    reason: string
  }) => api.post('/admin/coop-ledger', data),
}
