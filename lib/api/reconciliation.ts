import api from './client'

export const reconciliationApi = {
  // Proves (or disproves) that every wallet's and every cooperative
  // account's stored balance matches what its own transaction log sums to.
  getReport: () => api.get('/admin/reconciliation'),

  // The one number to check against the real bank statement — total gross
  // cash received in a given month, broken down by where it went.
  getCashReceipts: (month?: string) =>
    api.get('/admin/reconciliation/cash-receipts', { params: month ? { month } : undefined }),
}
