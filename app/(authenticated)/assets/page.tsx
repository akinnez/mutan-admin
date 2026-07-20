'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetsApi } from '@/lib/api/assets'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Building2, Plus, TrendingDown, DollarSign } from 'lucide-react'
import type { FixedAsset } from '@/lib/types'

const categoryIcons: Record<string, string> = { land: '🏞️', building: '🏢', vehicle: '🚗', equipment: '⚙️' }

export default function AssetsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showDepreciate, setShowDepreciate] = useState(false)
  const [showDistribute, setShowDistribute] = useState(false)
  const [distributeForm, setDistributeForm] = useState({ asset_id: '', amount_to_distribute: '', note: '' })
  const { register, handleSubmit, reset } = useForm<any>()

  const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: () => assetsApi.list() })
  const result = data?.data?.data ?? data?.data
  const assets: FixedAsset[] = result?.assets ?? []
  const total_book_value: number = result?.total_book_value ?? 0

  const createMutation = useMutation({
    mutationFn: (d: any) => assetsApi.create({ ...d, acquisition_cost: parseFloat(d.acquisition_cost), depreciation_rate: d.depreciation_rate ? parseFloat(d.depreciation_rate) : undefined }),
    onSuccess: () => { toast.success('Asset added to register'); qc.invalidateQueries({ queryKey: ['assets'] }); setShowCreate(false); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const depreciateMutation = useMutation({
    mutationFn: () => assetsApi.applyDepreciation(),
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data
      toast.success(`Depreciation applied to ${r.assets_processed} assets`)
      qc.invalidateQueries({ queryKey: ['assets'] })
      setShowDepreciate(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const distributeMutation = useMutation({
    mutationFn: () => assetsApi.distributeIncome({ ...distributeForm, amount_to_distribute: parseFloat(distributeForm.amount_to_distribute) }),
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data
      toast.success(`₦${formatCurrency(r.amount_distributed)} distributed to ${r.members_credited} members`)
      qc.invalidateQueries({ queryKey: ['assets'] })
      setShowDistribute(false)
      setDistributeForm({ asset_id: '', amount_to_distribute: '', note: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Distribution failed'),
  })

  return (
    <div>
      <TopBar title="Assets" subtitle="Fixed asset register" />
      <div className="p-6">
        <PageHeader title="Fixed Asset Register"
          subtitle={`Total book value: ${formatCurrency(total_book_value)}`}
          action={
            <div className="flex gap-2">
              <button onClick={() => setShowDistribute(true)} className="btn-secondary flex items-center gap-2"><DollarSign size={13} /> Distribute Income</button>
              <button onClick={() => setShowDepreciate(true)} className="btn-secondary flex items-center gap-2"><TrendingDown size={13} /> Apply Depreciation</button>
              <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add Asset</button>
            </div>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        ) : assets.length === 0 ? (
          <div className="card"><EmptyState icon={Building2} title="No assets recorded" description="Add cooperative assets to the register." /></div>
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                    {['Asset', 'Category', 'Acquisition Cost', 'Book Value', 'Depreciation', 'Income YTD', 'Distribution', 'Date', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-xs">{a.name}</p>
                        {a.funded_from && <p className="text-xs text-gray-400">Funded: {a.funded_from}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{categoryIcons[a.category]} {a.category}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatCurrency(a.acquisition_cost)}</td>
                      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(a.current_book_value)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{a.depreciation_rate}%/yr</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatCurrency(a.income_generated_ytd)}</td>
                      <td className="px-4 py-3 text-xs capitalize whitespace-nowrap">{a.distribution_method.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(a.acquisition_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {assets.map(a => (
                <MobileCard key={a.id}>
                  <MobileCardHeader
                    title={a.name}
                    subtitle={a.funded_from ? `Funded: ${a.funded_from}` : undefined}
                    right={<StatusBadge status={a.status} />}
                  />
                  <MobileRow label="Category" value={`${categoryIcons[a.category]} ${a.category}`} />
                  <MobileRow label="Acquisition Cost" value={formatCurrency(a.acquisition_cost)} />
                  <MobileRow label="Book Value" value={<span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(a.current_book_value)}</span>} />
                  <MobileRow label="Depreciation" value={`${a.depreciation_rate}%/yr`} />
                  <MobileRow label="Income YTD" value={formatCurrency(a.income_generated_ytd)} />
                  <MobileRow label="Distribution" value={<span className="capitalize">{a.distribution_method.replace('_', ' ')}</span>} />
                  <MobileRow label="Date" value={formatDate(a.acquisition_date)} />
                </MobileCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add Fixed Asset" size="lg">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Asset Name" required><Input {...register('name')} placeholder="MUTAN Secretariat Land" /></FormField>
            <FormField label="Category" required>
              <Select {...register('category')}>
                <option value="land">Land</option>
                <option value="building">Building</option>
                <option value="vehicle">Vehicle</option>
                <option value="equipment">Equipment</option>
              </Select>
            </FormField>
            <FormField label="Acquisition Cost (₦)" required><Input type="number" {...register('acquisition_cost')} /></FormField>
            <FormField label="Acquisition Date" required><Input type="date" {...register('acquisition_date')} /></FormField>
            <FormField label="Depreciation Rate (%/year)" hint="Land = 0, Building ≈ 5, Vehicle ≈ 20">
              <Input type="number" step="0.1" {...register('depreciation_rate')} />
            </FormField>
            <FormField label="Distribution Method">
              <Select {...register('distribution_method')}>
                <option value="retained">Retained (no distribution)</option>
                <option value="equal">Equal per member</option>
                <option value="by_savings">By savings balance</option>
                <option value="by_shares">By share holdings</option>
              </Select>
            </FormField>
            <FormField label="Funded From (optional)"><Input {...register('funded_from')} placeholder="e.g. Investment Pool" /></FormField>
          </div>
          <FormField label="Notes"><Textarea {...register('notes')} placeholder="Additional details about this asset" /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Adding…' : 'Add Asset'}</button>
          </div>
        </form>
      </Modal>

      {/* Distribute Income Modal */}
      <Modal open={showDistribute} onClose={() => setShowDistribute(false)} title="Distribute Asset Income" size="sm">
        <div className="space-y-4">
          <FormField label="Select Asset" required>
            <Select value={distributeForm.asset_id} onChange={e => setDistributeForm(f => ({ ...f, asset_id: e.target.value }))}>
              <option value="">Choose an asset…</option>
              {assets.filter(a => a.distribution_method !== 'retained').map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.distribution_method})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount to Distribute (₦)" required>
            <Input type="number" value={distributeForm.amount_to_distribute} onChange={e => setDistributeForm(f => ({ ...f, amount_to_distribute: e.target.value }))} />
          </FormField>
          <FormField label="Note"><Input value={distributeForm.note} onChange={e => setDistributeForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Q1 2026 rental income" /></FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDistribute(false)} className="btn-secondary">Cancel</button>
            <button disabled={!distributeForm.asset_id || !distributeForm.amount_to_distribute || distributeMutation.isPending}
              onClick={() => distributeMutation.mutate()} className="btn-primary">
              {distributeMutation.isPending ? 'Distributing…' : 'Distribute'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={showDepreciate} onClose={() => setShowDepreciate(false)}
        onConfirm={() => depreciateMutation.mutate()} loading={depreciateMutation.isPending}
        title="Apply Annual Depreciation"
        message="This will reduce the book value of all active depreciable assets by their annual depreciation rate. This is an AGM-level action and should only be run once per year." confirmLabel="Apply Depreciation" />
    </div>
  )
}
