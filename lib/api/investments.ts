import api from './client'

export const investmentsApi = {
  list: () => api.get('/admin/investments'),
  getOne: (id: string) => api.get(`/admin/investments/${id}`),
  create: (data: Record<string, any>) => api.post('/admin/investments', data),
  checkEligibility: (roundId: string, memberId: string) =>
    api.get(`/admin/investments/${roundId}/eligibility/${memberId}`),
  mature: (id: string, data: { actual_profit: number }) =>
    api.patch(`/admin/investments/${id}/mature`, data),
  distribute: (id: string) => api.post(`/admin/investments/${id}/distribute`),
}
