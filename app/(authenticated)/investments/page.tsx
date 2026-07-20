'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { investmentsApi } from '@/lib/api/investments'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField, Input, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { TrendingUp, Plus, Eye, CheckCircle, DollarSign } from 'lucide-react'
import type { InvestmentRound } from '@/lib/types'

export default function InvestmentsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState<InvestmentRound | null>(null)
  const [maturing, setMaturing] = useState<InvestmentRound | null>(null)
  const [distributing, setDistributing] = useState<InvestmentRound | null>(null)
  const [actualProfit, setActualProfit] = useState('')
  const { register, handleSubmit, reset } = useForm<any>()

  const { data, isLoading } = useQuery({ queryKey: ['investments'], queryFn: () => investmentsApi.list() })
  const rounds: InvestmentRound[] = data?.data?.data ?? data?.data ?? []

  const { data: detail } = useQuery({
    queryKey: ['investment-detail', viewing?.id],
    queryFn: () => investmentsApi.getOne(viewing!.id),
    enabled: !!viewing,
  })
  const roundDetail = detail?.data?.data ?? detail?.data

  const createMutation = useMutation({
    mutationFn: (d: any) => investmentsApi.create({
      ...d,
      target_amount: parseFloat(d.target_amount),
      profit_ratio: d.profit_ratio ? parseFloat(d.profit_ratio) : undefined,
      min_months_active: d.min_months_active ? parseInt(d.min_months_active) : undefined,
      min_savings_balance: d.min_savings_balance ? parseFloat(d.min_savings_balance) : undefined,
      min_shares_held: d.min_shares_held ? parseInt(d.min_shares_held) : undefined,
      max_investment_amount: d.max_investment_amount ? parseFloat(d.max_investment_amount) : undefined,
      max_percent_of_round: d.max_percent_of_round ? parseFloat(d.max_percent_of_round) : undefined,
      requires_good_standing: true,
    }),
    onSuccess: () => { toast.success('Investment round created'); qc.invalidateQueries({ queryKey: ['investments'] }); setShowCreate(false); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const matureMutation = useMutation({
    mutationFn: ({ id, profit }: { id: string; profit: number }) => investmentsApi.mature(id, { actual_profit: profit }),
    onSuccess: () => { toast.success('Round marked as matured. Run profit distribution next.'); qc.invalidateQueries({ queryKey: ['investments'] }); setMaturing(null); setActualProfit('') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const distributeMutation = useMutation({
    mutationFn: (id: string) => investmentsApi.distribute(id),
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data
      toast.success(`Profit distributed to ${r.investors_paid} investors`)
      qc.invalidateQueries({ queryKey: ['investments'] })
      setDistributing(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const fillPercent = (r: InvestmentRound) =>
    r.target_amount > 0 ? Math.min(100, (r.amount_raised / r.target_amount) * 100) : 0

  return (
    <div>
      <TopBar title="Investments" subtitle="Halal investment round management" />
      <div className="p-6">
        <PageHeader title="Investment Rounds" subtitle={`${rounds.length} rounds total`}
          action={<button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> New Round</button>} />

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        ) : rounds.length === 0 ? (
          <div className="card"><EmptyState icon={TrendingUp} title="No investment rounds" description="Create a halal investment round for members to participate in." /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rounds.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-0.5">{r.name}</h3>
                    <p className="text-xs text-gray-400">{formatDate(r.open_date)} → {formatDate(r.maturity_date)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Raised</span>
                    <span className="font-medium">{formatCurrency(r.amount_raised)} / {formatCurrency(r.target_amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${fillPercent(r)}%`, background: 'var(--forest)' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{fillPercent(r).toFixed(1)}% funded · {r.investor_count ?? 0} investors</p>
                </div>

                {r.profit_ratio && (
                  <p className="text-xs mb-3" style={{ color: 'var(--gold)' }}>
                    Projected profit ratio: {r.profit_ratio}%
                    {r.actual_profit !== undefined && r.actual_profit !== null && ` · Actual: ${formatCurrency(r.actual_profit)}`}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setViewing(r)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 py-2 text-xs"><Eye size={12} /> Details</button>
                  {r.status === 'open' || r.status === 'active' ? (
                    <button onClick={() => setMaturing(r)} className="p-2 rounded-xl border text-gray-500 hover:bg-gray-50" style={{ borderColor: 'var(--border)' }} title="Mark as matured">
                      <CheckCircle size={15} />
                    </button>
                  ) : null}
                  {r.status === 'matured' && (
                    <button onClick={() => setDistributing(r)} className="btn-gold flex items-center gap-1.5 py-2 px-3 text-xs">
                      <DollarSign size={12} /> Distribute
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Round Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Create Investment Round" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Round Name" required><Input {...register('name')} placeholder="2026 Trade Finance Pool" /></FormField>
            <FormField label="Target Amount (₦)" required><Input type="number" {...register('target_amount')} placeholder="5000000" /></FormField>
            <FormField label="Open Date" required><Input type="date" {...register('open_date')} /></FormField>
            <FormField label="Maturity Date" required><Input type="date" {...register('maturity_date')} /></FormField>
            <FormField label="Projected Profit Ratio (%)"><Input type="number" step="0.01" {...register('profit_ratio')} placeholder="12.5" /></FormField>
            <FormField label="Max Investment per Member (₦)"><Input type="number" {...register('max_investment_amount')} placeholder="500000" /></FormField>
            <FormField label="Max % of Round per Member"><Input type="number" {...register('max_percent_of_round')} placeholder="20" /></FormField>
          </div>
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--forest)' }}>ELIGIBILITY CRITERIA (leave blank for no restriction)</p>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Min Months Active"><Input type="number" {...register('min_months_active')} placeholder="6" /></FormField>
              <FormField label="Min Savings Balance (₦)"><Input type="number" {...register('min_savings_balance')} placeholder="50000" /></FormField>
              <FormField label="Min Shares Held"><Input type="number" {...register('min_shares_held')} placeholder="10" /></FormField>
            </div>
          </div>
          <FormField label="Description"><Textarea {...register('description')} placeholder="Brief description of this investment round" /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Creating…' : 'Create Round'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? ''} size="lg">
        {roundDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Investors', value: roundDetail.investor_count ?? 0 },
                { label: 'Amount Raised', value: formatCurrency(roundDetail.amount_raised) },
                { label: 'Target', value: formatCurrency(roundDetail.target_amount) },
              ].map(({ label, value }) => (
                <div key={label} className="card p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--forest)' }}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--forest)' }}>INVESTORS</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {(roundDetail.investments ?? []).map((inv: any) => (
                  <div key={inv.member_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--forest-light)' }}>
                    <div>
                      <p className="text-xs font-medium">{inv.full_name}</p>
                      <p className="text-xs text-gray-400">{inv.mutan_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(inv.amount_invested)}</p>
                      {inv.profit_share && <p className="text-xs text-gray-400">Profit: {formatCurrency(inv.profit_share)}</p>}
                    </div>
                  </div>
                ))}
                {!roundDetail.investments?.length && <p className="text-xs text-gray-400 py-2">No investors yet</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Mature Modal */}
      <Modal open={!!maturing} onClose={() => { setMaturing(null); setActualProfit('') }} title="Mature Investment Round" size="sm">
        {maturing && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Enter the actual profit generated by <strong>{maturing.name}</strong>. This will mark the round as matured.</p>
            <FormField label="Actual Profit (₦)" required>
              <Input type="number" value={actualProfit} onChange={e => setActualProfit(e.target.value)} placeholder="e.g. 650000" />
            </FormField>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setMaturing(null); setActualProfit('') }} className="btn-secondary">Cancel</button>
              <button disabled={!actualProfit || matureMutation.isPending}
                onClick={() => matureMutation.mutate({ id: maturing.id, profit: parseFloat(actualProfit) })}
                className="btn-primary">{matureMutation.isPending ? 'Saving…' : 'Mark as Matured'}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!distributing} onClose={() => setDistributing(null)}
        onConfirm={() => distributing && distributeMutation.mutate(distributing.id)}
        loading={distributeMutation.isPending}
        title="Distribute Profit"
        message={`This will distribute the profit from "${distributing?.name}" to all investors proportionally. Credits will be posted to Normal Savings wallets. This cannot be undone.`}
        confirmLabel="Distribute Profit" />
    </div>
  )
}
