'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adjustmentsApi, AdjustmentAction } from '@/lib/api/adjustments'
import { membersApi } from '@/lib/api/members'
import { useAuthStore } from '@/lib/stores/auth.store'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField, Input, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import {
  SlidersHorizontal, Plus, Search, ArrowUpRight, ArrowDownRight,
  Wallet, Landmark, CheckCircle2, XCircle, ShieldAlert, X as XIcon,
} from 'lucide-react'

const ACTION_LABEL: Record<AdjustmentAction, string> = {
  wallet_credit: 'Credit a Wallet',
  wallet_debit: 'Debit a Wallet',
  loan_reduce_balance: 'Reduce Loan Balance',
  loan_increase_balance: 'Increase Loan Balance',
}

const ACTION_HINT: Record<AdjustmentAction, string> = {
  wallet_credit: 'Adds money to a scheme wallet — e.g. this month\u2019s payment should have gone to savings, not the loan.',
  wallet_debit: 'Removes money from a scheme wallet — e.g. reversing a credit that was posted in error.',
  loan_reduce_balance: 'Reduces what the member still owes, as if a repayment was made.',
  loan_increase_balance: 'Adds back to what the member owes — e.g. reversing a repayment that shouldn\u2019t have posted.',
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending_confirmation', label: 'Awaiting Confirmation' },
  { value: 'posted', label: 'Posted' },
  { value: 'rejected', label: 'Rejected' },
]

const emptyForm = {
  action: '' as AdjustmentAction | '',
  wallet_id: '',
  loan_id: '',
  amount: '',
  reason: '',
  month_label: '',
  related_reference: '',
}

export default function AdjustmentsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate = user?.role === 'financial_secretary'
  const canReview = user?.role === 'chairman' || user?.role === 'board_director'

  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<{ id: string; full_name: string; mutan_id: string } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmingCreate, setConfirmingCreate] = useState(false)
  const [confirmingPost, setConfirmingPost] = useState<any>(null)
  const [rejecting, setRejecting] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: listData, isLoading } = useQuery({
    queryKey: ['adjustments', statusFilter],
    queryFn: () => adjustmentsApi.list({ status: statusFilter || undefined }),
    refetchInterval: 30_000,
  })
  const adjustments: any[] = listData?.data?.data ?? listData?.data ?? []

  const { data: memberSearchData, isFetching: searchingMembers } = useQuery({
    queryKey: ['member-search', memberQuery],
    queryFn: () => membersApi.list({ search: memberQuery, limit: 8 }),
    enabled: memberQuery.trim().length >= 2 && !selectedMember,
  })
  const memberResults: any[] = memberSearchData?.data?.data ?? memberSearchData?.data ?? []

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['adjustment-member-accounts', selectedMember?.id],
    queryFn: () => adjustmentsApi.getMemberAccounts(selectedMember!.id),
    enabled: !!selectedMember,
  })
  const memberAccounts = accountsData?.data?.data ?? accountsData?.data ?? { wallets: [], loans: [] }

  const resetForm = () => {
    setForm(emptyForm)
    setSelectedMember(null)
    setMemberQuery('')
  }

  const createMutation = useMutation({
    mutationFn: () => adjustmentsApi.create({
      member_id: selectedMember!.id,
      action: form.action as AdjustmentAction,
      wallet_id: form.wallet_id || undefined,
      loan_id: form.loan_id || undefined,
      amount: parseFloat(form.amount),
      reason: form.reason,
      month_label: form.month_label || undefined,
      related_reference: form.related_reference || undefined,
    }),
    onSuccess: () => {
      toast.success('Adjustment submitted — awaiting a second admin\u2019s confirmation before it posts.')
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      setShowForm(false)
      setConfirmingCreate(false)
      resetForm()
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? 'Could not submit adjustment')
      setConfirmingCreate(false)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => adjustmentsApi.confirm(id),
    onSuccess: () => {
      toast.success('Adjustment confirmed and posted to the member\u2019s account')
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      setConfirmingPost(null)
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? 'Could not confirm adjustment')
      setConfirmingPost(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adjustmentsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Adjustment rejected')
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      setRejecting(null)
      setRejectReason('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not reject adjustment'),
  })

  const isWalletAction = form.action === 'wallet_credit' || form.action === 'wallet_debit'
  const isLoanAction = form.action === 'loan_reduce_balance' || form.action === 'loan_increase_balance'
  const selectedWallet = memberAccounts.wallets?.find((w: any) => w.id === form.wallet_id)
  const selectedLoan = memberAccounts.loans?.find((l: any) => l.id === form.loan_id)

  const canSubmit = !!selectedMember && !!form.action
    && (isWalletAction ? !!form.wallet_id : true)
    && (isLoanAction ? !!form.loan_id : true)
    && !!form.amount && parseFloat(form.amount) > 0
    && form.reason.trim().length >= 10

  const confirmMessage = useMemo(() => {
    if (!form.action || !selectedMember) return ''
    const amt = form.amount ? formatCurrency(parseFloat(form.amount)) : '\u20a60.00'
    const target = isWalletAction ? (selectedWallet?.scheme_name ?? 'the selected wallet') : `loan #${form.loan_id.slice(0, 8)}`
    return `This will submit a ${ACTION_LABEL[form.action as AdjustmentAction].toLowerCase()} of ${amt} for ${selectedMember.full_name} against ${target}. Nothing moves until a different admin (Chairman or Board Director) reviews and confirms it.`
  }, [form, selectedMember, selectedWallet, isWalletAction])

  return (
    <div>
      <TopBar title="Account Adjustments" subtitle="Manual corrections to a member's wallet or loan balance \u2014 dual control, fully audited" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Account Adjustments"
          subtitle={canCreate
            ? 'Only the Financial Secretary can create an adjustment. A different admin must confirm it before it posts.'
            : canReview
              ? 'Review and confirm adjustments submitted by the Financial Secretary. You cannot confirm your own submissions.'
              : 'A read-only record of every manual correction made to a member\u2019s wallet or loan balance.'}
          action={canCreate ? (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5">
              <Plus size={14} /> New Adjustment
            </button>
          ) : undefined}
        />

        {!canCreate && !canReview && (
          <div className="card p-4 flex items-center gap-3 text-xs text-gray-500" style={{ background: 'var(--forest-light)' }}>
            <ShieldAlert size={16} style={{ color: 'var(--forest)' }} />
            Only the Financial Secretary can create adjustments, and only the Chairman or a Board Director can confirm them.
          </div>
        )}

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === t.value ? 'var(--forest)' : '#fff',
                color: statusFilter === t.value ? '#fff' : 'var(--charcoal)',
                border: '1px solid var(--border)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading\u2026</p>
          ) : adjustments.length === 0 ? (
            <EmptyState icon={SlidersHorizontal} title="No adjustments yet"
              description="Manual corrections to member wallets or loan balances will appear here, with full creator/confirmer history." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Member', 'Action', 'Target', 'Amount', 'Reason', 'Status', 'Created By', 'Confirmed By', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((a) => (
                      <tr key={a.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{a.member?.full_name}<span className="text-gray-400 ml-1">{a.member?.mutan_id}</span></td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {a.action?.includes('increase') || a.action === 'wallet_credit'
                              ? <ArrowUpRight size={12} className="text-green-600" />
                              : <ArrowDownRight size={12} className="text-red-600" />}
                            {ACTION_LABEL[a.action as AdjustmentAction] ?? a.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            {a.target?.type === 'loan' ? <Landmark size={11} /> : <Wallet size={11} />}
                            {a.target?.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(a.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate" title={a.reason}>{a.reason}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{a.created_by}</td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{a.confirmed_by ?? '\u2014'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {a.status === 'pending_confirmation' && canReview && a.created_by_id !== user?.id && (
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmingPost(a)} className="text-green-600 hover:text-green-700" title="Confirm & post">
                                <CheckCircle2 size={16} />
                              </button>
                              <button onClick={() => setRejecting(a)} className="text-red-600 hover:text-red-700" title="Reject">
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                          {a.status === 'pending_confirmation' && a.created_by_id === user?.id && (
                            <span className="text-gray-300 italic">awaiting 2nd admin</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {adjustments.map((a) => (
                  <MobileCard key={a.id}>
                    <MobileCardHeader
                      title={a.member?.full_name}
                      subtitle={formatDateTime(a.created_at)}
                      right={<StatusBadge status={a.status} />}
                    />
                    <MobileRow label="Action" value={ACTION_LABEL[a.action as AdjustmentAction] ?? a.action} />
                    <MobileRow label="Target" value={a.target?.label} />
                    <MobileRow label="Amount" value={<span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(a.amount)}</span>} />
                    <MobileRow label="Created By" value={a.created_by} />
                    <MobileRow label="Confirmed By" value={a.confirmed_by ?? '\u2014'} />
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>{a.reason}</p>
                    {a.status === 'pending_confirmation' && canReview && a.created_by_id !== user?.id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setConfirmingPost(a)} className="btn-primary flex-1 text-xs py-2">Confirm</button>
                        <button onClick={() => setRejecting(a)} className="btn-danger flex-1 text-xs py-2">Reject</button>
                      </div>
                    )}
                  </MobileCard>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Adjustment Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm() }} title="New Account Adjustment" size="lg">
        <div className="space-y-4">
          {/* Member picker */}
          {!selectedMember ? (
            <FormField label="Member" required hint="Search by name, MUTAN ID, staff ID, or phone number.">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Start typing a member's name\u2026"
                  className="pl-9"
                />
              </div>
              {memberQuery.trim().length >= 2 && (
                <div className="mt-2 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  {searchingMembers ? (
                    <p className="text-xs text-gray-400 p-3">Searching\u2026</p>
                  ) : memberResults.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3">No members found.</p>
                  ) : (
                    memberResults.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedMember({ id: m.id, full_name: m.full_name, mutan_id: m.mutan_id }); setMemberQuery('') }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span className="font-medium">{m.full_name}</span>
                        <span className="text-gray-400 ml-2">{m.mutan_id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </FormField>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'var(--forest-light)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--forest)' }}>{selectedMember.full_name}</p>
                <p className="text-xs text-gray-500">{selectedMember.mutan_id}</p>
              </div>
              <button onClick={() => { setSelectedMember(null); setForm(emptyForm) }} className="p-1 rounded-lg hover:bg-white/60 text-gray-500">
                <XIcon size={14} />
              </button>
            </div>
          )}

          {selectedMember && (
            <>
              <FormField label="What are you doing?" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(ACTION_LABEL) as AdjustmentAction[]).map((a) => (
                    <button key={a} type="button"
                      onClick={() => setForm((f) => ({ ...f, action: a, wallet_id: '', loan_id: '' }))}
                      className="text-left px-3 py-2.5 rounded-xl border text-xs transition-all"
                      style={{
                        borderColor: form.action === a ? 'var(--forest)' : '#e2e8f0',
                        background: form.action === a ? 'var(--forest-light)' : '#fff',
                      }}>
                      <p className="font-medium" style={{ color: form.action === a ? 'var(--forest)' : 'var(--charcoal)' }}>{ACTION_LABEL[a]}</p>
                      <p className="text-gray-400 mt-0.5">{ACTION_HINT[a]}</p>
                    </button>
                  ))}
                </div>
              </FormField>

              {loadingAccounts && <p className="text-xs text-gray-400">Loading member's wallets and loans\u2026</p>}

              {isWalletAction && !loadingAccounts && (
                <FormField label="Scheme Wallet" required>
                  {memberAccounts.wallets?.length === 0 ? (
                    <p className="text-xs text-red-500">This member has no wallets to adjust.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {memberAccounts.wallets?.map((w: any) => (
                        <button key={w.id} type="button" onClick={() => setForm((f) => ({ ...f, wallet_id: w.id }))}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs"
                          style={{ borderColor: form.wallet_id === w.id ? 'var(--forest)' : '#e2e8f0', background: form.wallet_id === w.id ? 'var(--forest-light)' : '#fff' }}>
                          <span>{w.scheme_name}</span>
                          <span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(w.balance)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </FormField>
              )}

              {isLoanAction && !loadingAccounts && (
                <FormField label="Loan" required>
                  {memberAccounts.loans?.length === 0 ? (
                    <p className="text-xs text-red-500">This member has no active or fully-paid loans to adjust.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {memberAccounts.loans?.map((l: any) => (
                        <button key={l.id} type="button" onClick={() => setForm((f) => ({ ...f, loan_id: l.id }))}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs"
                          style={{ borderColor: form.loan_id === l.id ? 'var(--forest)' : '#e2e8f0', background: form.loan_id === l.id ? 'var(--forest-light)' : '#fff' }}>
                          <span>Principal {formatCurrency(l.principal_amount)} \u00b7 <StatusBadge status={l.status} /></span>
                          <span className="font-semibold" style={{ color: 'var(--forest)' }}>Owes {formatCurrency(l.outstanding_balance)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </FormField>
              )}

              <FormField label="Amount (\u20a6)" required>
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 15000" />
              </FormField>

              <FormField label="Reason" required hint="Minimum 10 characters \u2014 this is what the confirming admin reviews. Be specific.">
                <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. May 2026 payment was fully absorbed by loan repayment under the flexible-repayment policy; this reallocates \u20a65,000 of it to the Ramadan savings scheme." />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Month (optional)">
                  <Input value={form.month_label} onChange={(e) => setForm((f) => ({ ...f, month_label: e.target.value }))} placeholder="e.g. 2026-05" />
                </FormField>
                <FormField label="Reference (optional)" hint="e.g. links to a payment or a paired adjustment.">
                  <Input value={form.related_reference} onChange={(e) => setForm((f) => ({ ...f, related_reference: e.target.value }))} placeholder="e.g. reverses MTN-2026-0417" />
                </FormField>
              </div>

              <button onClick={() => setConfirmingCreate(true)} disabled={!canSubmit} className="btn-primary w-full flex items-center justify-center gap-2">
                Review &amp; Submit
              </button>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingCreate}
        onClose={() => setConfirmingCreate(false)}
        onConfirm={() => createMutation.mutate()}
        title="Submit this adjustment?"
        message={confirmMessage}
        confirmLabel="Yes, Submit for Confirmation"
        loading={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmingPost}
        onClose={() => setConfirmingPost(null)}
        onConfirm={() => confirmMutation.mutate(confirmingPost.id)}
        title="Confirm & post this adjustment?"
        message={confirmingPost
          ? `This will move ${formatCurrency(confirmingPost.amount)} against ${confirmingPost.target?.label} for ${confirmingPost.member?.full_name}. Once posted, this cannot be undone from here \u2014 a correcting adjustment would be needed instead.`
          : ''}
        confirmLabel="Yes, Confirm & Post"
        loading={confirmMutation.isPending}
      />

      <Modal open={!!rejecting} onClose={() => { setRejecting(null); setRejectReason('') }} title="Reject Adjustment" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Rejecting <strong>{rejecting?.action ? ACTION_LABEL[rejecting.action as AdjustmentAction] : ''}</strong> of {rejecting ? formatCurrency(rejecting.amount) : ''} for {rejecting?.member?.full_name}. No balance is affected.
          </p>
          <FormField label="Reason for rejection" required>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Amount doesn't match the bank statement \u2014 please resubmit with the correct figure." />
          </FormField>
          <button
            onClick={() => rejecting && rejectMutation.mutate({ id: rejecting.id, reason: rejectReason })}
            disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
            className="btn-danger w-full"
          >
            {rejectMutation.isPending ? 'Rejecting\u2026' : 'Reject Adjustment'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
