'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schemesApi } from '@/lib/api/schemes'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency } from '@/lib/utils/format'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BookOpen, Plus, ToggleLeft, ToggleRight, Eye } from 'lucide-react'
import type { Scheme } from '@/lib/types'

export default function SchemesPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState<Scheme | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['schemes'], queryFn: () => schemesApi.list() })
  const schemes: Scheme[] = data?.data?.data ?? data?.data ?? []

  const { data: detail } = useQuery({
    queryKey: ['scheme-detail', viewing?.id],
    queryFn: () => schemesApi.getOne(viewing!.id),
    enabled: !!viewing,
  })
  const schemeDetail = detail?.data?.data ?? detail?.data

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const createMutation = useMutation({
    mutationFn: (d: any) => schemesApi.create({
      ...d,
      is_compulsory: d.is_compulsory === 'true',
      monthly_target: d.monthly_target ? parseFloat(d.monthly_target) : undefined,
      target_amount: d.target_amount ? parseFloat(d.target_amount) : undefined,
      waterfall_priority: d.waterfall_priority ? parseInt(d.waterfall_priority) : undefined,
    }),
    onSuccess: () => { toast.success('Scheme created'); qc.invalidateQueries({ queryKey: ['schemes'] }); setShowCreate(false); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => schemesApi.toggle(id),
    onSuccess: () => { toast.success('Scheme updated'); qc.invalidateQueries({ queryKey: ['schemes'] }) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  return (
    <div>
      <TopBar title="Schemes" subtitle="Manage savings schemes" />
      <div className="p-6">
        <PageHeader title="Savings Schemes" subtitle={`${schemes.length} schemes configured`}
          action={<button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> New Scheme</button>} />

        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        : schemes.length === 0 ? <div className="card"><EmptyState icon={BookOpen} title="No schemes yet" description="Create your first savings scheme." /></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {schemes.map(s => (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{s.name}</h3>
                      {s.is_compulsory && <span className="badge-green px-2 py-0.5 rounded-full text-xs">Compulsory</span>}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{s.description ?? 'No description'}</p>
                  </div>
                  <StatusBadge status={s.is_active ? 'active' : 'suspended'} label={s.is_active ? 'Active' : 'Inactive'} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl text-center" style={{ background: 'var(--forest-light)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(s.total_balance ?? 0)}</p>
                    <p className="text-xs text-gray-400">Total Balance</p>
                  </div>
                  <div className="p-2.5 rounded-xl text-center" style={{ background: 'var(--gold-light, #fffbeb)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{s.subscriber_count ?? 0}</p>
                    <p className="text-xs text-gray-400">Subscribers</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span>Priority: {s.waterfall_priority}</span>
                  {s.monthly_target && <span>Target: {formatCurrency(s.monthly_target)}/mo</span>}
                  {s.lock_until && <span>Locked until {s.lock_until}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewing(s)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 py-2"><Eye size={13} /> View</button>
                  {!s.is_compulsory && (
                    <button onClick={() => toggleMutation.mutate(s.id)} className="p-2 rounded-xl border text-gray-500 hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                      {s.is_active ? <ToggleRight size={16} style={{ color: 'var(--forest)' }} /> : <ToggleLeft size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Scheme Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Create New Scheme" size="lg">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheme Name" required>
              <Input {...register('name', { required: true })} placeholder="e.g. Hajj Savings" />
            </FormField>
            <FormField label="Compulsory?" required>
              <Select {...register('is_compulsory')}>
                <option value="false">Optional</option>
                <option value="true">Compulsory (auto-enroll all)</option>
              </Select>
            </FormField>
            <FormField label="Monthly Target (₦)">
              <Input type="number" {...register('monthly_target')} placeholder="15000" />
            </FormField>
            <FormField label="Total Target Amount (₦)">
              <Input type="number" {...register('target_amount')} placeholder="optional" />
            </FormField>
            <FormField label="Waterfall Priority" hint="Lower number = higher priority">
              <Input type="number" {...register('waterfall_priority')} placeholder="e.g. 1" />
            </FormField>
            <FormField label="Lock Until">
              <Input type="date" {...register('lock_until')} />
            </FormField>
            <FormField label="Next Payout Date">
              <Input type="date" {...register('next_payout_date')} />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea {...register('description')} placeholder="Brief description of this scheme" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating…' : 'Create Scheme'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Scheme Detail Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? 'Scheme Detail'} size="lg">
        {schemeDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--forest)' }}>{formatCurrency(schemeDetail.total_balance ?? 0)}</p>
                <p className="text-xs text-gray-400">Total Balance</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{schemeDetail.subscriber_count ?? 0}</p>
                <p className="text-xs text-gray-400">Subscribers</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold">{schemeDetail.waterfall_priority}</p>
                <p className="text-xs text-gray-400">Priority</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--forest)' }}>SUBSCRIBERS</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {(schemeDetail.subscribers ?? []).map((s: any) => (
                  <div key={s.member_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--forest-light)' }}>
                    <div>
                      <p className="text-xs font-medium">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.mutan_id} {s.is_paused && '· Paused'}</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(s.monthly_amount)}/mo</p>
                  </div>
                ))}
                {!(schemeDetail.subscribers?.length) && <p className="text-xs text-gray-400 py-2">No subscribers yet</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
