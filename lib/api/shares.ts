import api from './client'

export type ShareTypeParam = 'mutan' | 'cbt'

export const sharesApi = {
  getSettings: (type: ShareTypeParam) => api.get(`/admin/shares/${type}/settings`),
  updateSettings: (type: ShareTypeParam, data: Record<string, any>) =>
    api.patch(`/admin/shares/${type}/settings`, data),
  getRegister: (type: ShareTypeParam) => api.get(`/admin/shares/${type}/register`),
  // MUTAN only
  purchase: (data: { member_id: string; units: number }) => api.post('/admin/shares/purchase', data),
  declareDividend: (data: { dividend_per_unit: number; note?: string }) => api.post('/admin/shares/dividend', data),
  // Both types
  redeem: (type: ShareTypeParam, data: { member_id: string; units_to_redeem: number; reason?: string }) =>
    api.post(`/admin/shares/${type}/redeem`, data),
}
