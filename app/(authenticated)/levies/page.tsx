'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leviesApi } from '@/lib/api/levies'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { Modal } from '@/components/shared/Modal'
import { FormField, Input, Select } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency } from '@/lib/utils/format'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Receipt, Plus, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import type { LevyType } from '@/lib/types'

export default function LeviesPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<LevyType | null>(null)
  const { register, handleSubmit, reset, setValue } = useForm<any>()

  const { data, isLoading } = useQuery({ queryKey: ['levies'], queryFn: () => leviesApi.list() })
  const levies: LevyType[] = data?.data?.data ?? data?.data ?? []
  const total = levies.filter(l => l.is_active).reduce((s, l) => s + Number(l.amount), 0)

  const createMutation = useMutation({
    mutationFn: (d: any) => leviesApi.create({ ...d, amount: parseFloat(d.amount), deduction_order: parseInt(d.deduction_order ?? '99') }),
    onSuccess: () => { toast.success('Levy created'); qc.invalidateQueries({ queryKey: ['levies'] }); setShowCreate(false); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leviesApi.update(id, { ...data, amount: parseFloat(data.amount), deduction_order: parseInt(data.deduction_order) }),
    onSuccess: () => { toast.success('Levy updated'); qc.invalidateQueries({ queryKey: ['levies'] }); setEditing(null); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => leviesApi.toggle(id),
    onSuccess: () => { toast.success('Levy updated'); qc.invalidateQueries({ queryKey: ['levies'] }) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Toggle failed'),
  })

  const openEdit = (levy: LevyType) => {
    setEditing(levy)
    setValue('name', levy.name); setValue('amount', levy.amount); setValue('cooperative_account_type', levy.cooperative_account_type); setValue('deduction_order', levy.deduction_order)
  }

  const form = (onSubmit: (d: any) => void) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Levy Name" required><Input {...register('name')} placeholder="AGM Levy" /></FormField>
        <FormField label="Amount (₦)" required><Input type="number" {...register('amount')} placeholder="500" /></FormField>
        <FormField label="Cooperative Account" required>
          <Select {...register('cooperative_account_type')}>
            <option value="operational">Operational</option>
            <option value="development">Development</option>
            <option value="welfare">Welfare</option>
            <option value="reserve">Reserve</option>
            <option value="investment">Investment</option>
          </Select>
        </FormField>
        <FormField label="Deduction Order" hint="Lower = deducted first"><Input type="number" {...register('deduction_order')} placeholder="1" /></FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => { setShowCreate(false); setEditing(null); reset() }} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{editing ? 'Update Levy' : 'Create Levy'}</button>
      </div>
    </form>
  )

  return (
    <div>
      <TopBar title="Levies" subtitle="Monthly member deductions" />
      <div className="p-6">
        <PageHeader title="Levy Configuration" subtitle={`Total monthly levy per member: ${formatCurrency(total)}`}
          action={<button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> New Levy</button>} />

        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        : levies.length === 0 ? <div className="card"><EmptyState icon={Receipt} title="No levies configured" /></div>
        : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                    {['Order', 'Levy Name', 'Amount', 'Account Type', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levies.sort((a, b) => a.deduction_order - b.deduction_order).map(l => (
                    <tr key={l.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)', opacity: l.is_active ? 1 : 0.5 }}>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{l.deduction_order}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{l.name}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(l.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">{l.cooperative_account_type}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className={l.is_active ? 'badge-green' : 'badge-gray'} style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '11px' }}>{l.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(l)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                          <button onClick={() => toggleMutation.mutate(l.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                            {l.is_active ? <ToggleRight size={15} style={{ color: 'var(--forest)' }} /> : <ToggleLeft size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--forest-light)' }}>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>Total Monthly Levy</td>
                    <td className="px-4 py-2.5 text-sm font-bold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(total)}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              <div className="card p-3 flex items-center justify-between" style={{ background: 'var(--forest-light)', borderColor: 'var(--forest)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--forest)' }}>Total Monthly Levy</span>
                <span className="text-sm font-bold" style={{ color: 'var(--forest)' }}>{formatCurrency(total)}</span>
              </div>
              {levies.sort((a, b) => a.deduction_order - b.deduction_order).map(l => (
                <MobileCard key={l.id} className={l.is_active ? '' : 'opacity-50'}>
                  <MobileCardHeader
                    title={l.name}
                    subtitle={`Order #${l.deduction_order}`}
                    right={<span className={l.is_active ? 'badge-green' : 'badge-gray'} style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '11px' }}>{l.is_active ? 'Active' : 'Inactive'}</span>}
                  />
                  <MobileRow label="Amount" value={<span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(l.amount)}</span>} />
                  <MobileRow label="Account Type" value={<span className="capitalize">{l.cooperative_account_type}</span>} />
                  <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => openEdit(l)} className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => toggleMutation.mutate(l.id)} className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2">
                      {l.is_active ? <ToggleRight size={14} style={{ color: 'var(--forest)' }} /> : <ToggleLeft size={14} />}
                      {l.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}
      </div>
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Create New Levy">
        {form(d => createMutation.mutate(d))}
      </Modal>
      <Modal open={!!editing} onClose={() => { setEditing(null); reset() }} title="Edit Levy">
        {editing && form(d => updateMutation.mutate({ id: editing.id, data: d }))}
      </Modal>
    </div>
  )
}
