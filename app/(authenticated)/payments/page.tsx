'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '@/lib/api/payments'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { Receipt, CheckCircle, XCircle, ExternalLink, Search, Square, CheckSquare, MinusSquare } from 'lucide-react'
import type { ManualPayment } from '@/lib/types'

const paymentTypeLabel: Record<string, string> = {
  loan_repayment: 'Loan Repayment',
  wallet_topup: 'Wallet Top-up',
  subscription_payment: 'Subscription',
}

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [approving, setApproving] = useState<ManualPayment | null>(null)
  const [rejecting, setRejecting] = useState<ManualPayment | null>(null)
  const [verifiedAmount, setVerifiedAmount] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingBulk, setConfirmingBulk] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', statusFilter, search],
    queryFn: () => paymentsApi.list({ status: statusFilter || undefined, search: search || undefined }),
    refetchInterval: 30_000,
  })
  const payments: ManualPayment[] = data?.data?.data ?? data?.data ?? []

  // Bulk-select only makes sense for items still awaiting a decision —
  // selections are dropped automatically whenever the filter/search changes
  // the visible set, so a stale selection can never silently carry over.
  const selectablePayments = payments.filter(p => p.status === 'pending')
  const allSelected = selectablePayments.length > 0 && selectablePayments.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectablePayments.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectedPayments = payments.filter(p => selectedIds.has(p.id))
  const selectedTotal = selectedPayments.reduce((sum, p) => sum + Number(p.declared_amount), 0)

  const approveMutation = useMutation({
    mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      paymentsApi.approve(id, { verified_amount: amount, note }),
    onSuccess: () => {
      toast.success('Payment approved and posted to member account')
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['pending-count'] })
      setApproving(null)
      setVerifiedAmount('')
      setApproveNote('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Approval failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.reject(id, { rejection_reason: reason }),
    onSuccess: () => {
      toast.success('Payment declaration rejected')
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['pending-count'] })
      setRejecting(null)
      setRejectReason('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Rejection failed'),
  })

  const bulkApproveMutation = useMutation({
    mutationFn: () => paymentsApi.bulkApprove(Array.from(selectedIds)),
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data
      if (r.failed_count > 0) {
        toast.error(`${r.approved_count} approved, ${r.failed_count} failed — see console for details`)
        console.warn('Bulk approve results:', r.results)
      } else {
        toast.success(`${r.approved_count} payment${r.approved_count > 1 ? 's' : ''} approved and posted`)
      }
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['pending-count'] })
      setSelectedIds(new Set())
      setConfirmingBulk(false)
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? 'Bulk approval failed')
      setConfirmingBulk(false)
    },
  })

  // Drop the selection whenever the visible set changes underneath it —
  // a checked item should never silently apply to a different filter view.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter, search])

  return (
    <div>
      <TopBar title="Payments" subtitle="Manual payment declarations" />
      <div className="p-6">
        <PageHeader title="Payment Declarations" subtitle="Review member payment receipts and post to ledger" />

        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            {[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'All', value: '' },
            ].map(({ label, value }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === value ? 'text-white' : 'bg-white text-gray-500 border'}`}
                style={statusFilter === value ? { background: 'var(--forest)', borderColor: 'var(--forest)' } : { borderColor: 'var(--border)' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search member, MUTAN ID, or ref…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>

        {/* Bulk action bar — only shown once something's selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl"
            style={{ background: 'var(--charcoal)', color: '#fff' }}>
            <p className="text-sm">
              <strong>{selectedIds.size}</strong> selected — totaling <strong>{formatCurrency(selectedTotal)}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-white/60 hover:text-white px-2">
                Clear
              </button>
              <button onClick={() => setConfirmingBulk(true)} disabled={bulkApproveMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: 'var(--forest)' }}>
                <CheckCircle size={13} /> Approve Selected
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        ) : payments.length === 0 ? (
          <div className="card">
            <EmptyState icon={Receipt} title="No payment declarations" description="Member payment declarations will appear here for review." />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                    <th className="px-4 py-3 w-8">
                      {selectablePayments.length > 0 && (
                        <button onClick={toggleSelectAll} className="flex items-center text-gray-400 hover:text-gray-600">
                          {allSelected ? <CheckSquare size={16} style={{ color: 'var(--forest)' }} /> : someSelected ? <MinusSquare size={16} style={{ color: 'var(--forest)' }} /> : <Square size={16} />}
                        </button>
                      )}
                    </th>
                    {['Member', 'Type', 'Target', 'Declared', 'Bank Ref', 'Month', 'Status', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)', background: selectedIds.has(p.id) ? 'var(--forest-light)' : undefined }}>
                      <td className="px-4 py-3">
                        {p.status === 'pending' && (
                          <button onClick={() => toggleSelect(p.id)} className="flex items-center text-gray-400 hover:text-gray-600">
                            {selectedIds.has(p.id) ? <CheckSquare size={16} style={{ color: 'var(--forest)' }} /> : <Square size={16} />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-xs">{p.member?.full_name}</p>
                        <p className="text-xs text-gray-400">{p.member?.mutan_id}</p>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{paymentTypeLabel[p.payment_type] ?? p.payment_type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.target_scheme?.name ?? (p.target_loan ? 'Loan' : 'Waterfall')}</td>
                      <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(p.declared_amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{p.bank_reference}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.month_label ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 items-center">
                          {p.receipt_url && (
                            <a href={p.receipt_url} target="_blank" className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><ExternalLink size={12} /></a>
                          )}
                          {p.status === 'pending' && (
                            <>
                              <button onClick={() => { setApproving(p); setVerifiedAmount(String(p.declared_amount)) }}
                                className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-700"><CheckCircle size={13} /></button>
                              <button onClick={() => setRejecting(p)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><XCircle size={13} /></button>
                            </>
                          )}
                          {p.status === 'rejected' && p.rejection_reason && (
                            <span className="text-xs text-gray-400 italic truncate max-w-[100px]" title={p.rejection_reason}>{p.rejection_reason}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {payments.map(p => (
                <MobileCard key={p.id} style={selectedIds.has(p.id) ? { borderColor: 'var(--forest)', boxShadow: '0 0 0 1px var(--forest)' } : undefined}>
                  <div className="flex items-start gap-2">
                    {p.status === 'pending' && (
                      <button onClick={() => toggleSelect(p.id)} className="mt-0.5 flex-shrink-0 text-gray-400">
                        {selectedIds.has(p.id) ? <CheckSquare size={16} style={{ color: 'var(--forest)' }} /> : <Square size={16} />}
                      </button>
                    )}
                    <div className="flex-1">
                      <MobileCardHeader
                        title={p.member?.full_name}
                        subtitle={p.member?.mutan_id}
                        right={<StatusBadge status={p.status} />}
                      />
                      <MobileRow label="Type" value={paymentTypeLabel[p.payment_type] ?? p.payment_type} />
                      <MobileRow label="Target" value={p.target_scheme?.name ?? (p.target_loan ? 'Loan' : 'Waterfall')} />
                      <MobileRow label="Declared" value={<span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(p.declared_amount)}</span>} />
                      <MobileRow label="Bank Ref" value={<span className="font-mono">{p.bank_reference}</span>} />
                      <MobileRow label="Month" value={p.month_label ?? '—'} />
                      <MobileRow label="Submitted" value={formatDateTime(p.created_at)} />
                      {p.status === 'rejected' && p.rejection_reason && (
                        <p className="text-xs text-gray-400 italic mt-1">{p.rejection_reason}</p>
                      )}
                      <div className="flex gap-2 mt-3 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
                        {p.receipt_url && (
                          <a href={p.receipt_url} target="_blank" className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2" style={{ width: 'auto', flex: 1 }}>
                            <ExternalLink size={13} /> Receipt
                          </a>
                        )}
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => { setApproving(p); setVerifiedAmount(String(p.declared_amount)) }}
                              className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2" style={{ flex: 1, color: 'var(--forest)' }}>
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button onClick={() => setRejecting(p)}
                              className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2" style={{ flex: 1, color: '#991b1b' }}>
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal open={!!approving} onClose={() => { setApproving(null); setVerifiedAmount(''); setApproveNote('') }} title="Approve Payment" size="sm">
        {approving && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl space-y-2 text-xs" style={{ background: 'var(--forest-light)' }}>
              <div className="flex justify-between"><span className="text-gray-500">Member</span><span className="font-medium">{approving.member?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Declared Amount</span><span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(approving.declared_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bank Ref</span><span className="font-mono">{approving.bank_reference}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{paymentTypeLabel[approving.payment_type]}</span></div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Verified Amount <span className="text-red-500">*</span></label>
              <input type="number" value={verifiedAmount} onChange={e => setVerifiedAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
              <p className="text-xs text-gray-400 mt-1">Confirm the actual amount you verified in the bank statement.</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Note (optional)</label>
              <input value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="Any internal note about this payment"
                className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => { setApproving(null); setVerifiedAmount(''); setApproveNote('') }} className="btn-secondary">Cancel</button>
              <button disabled={!verifiedAmount || approveMutation.isPending}
                onClick={() => approveMutation.mutate({ id: approving.id, amount: parseFloat(verifiedAmount), note: approveNote || undefined })}
                className="btn-primary">
                {approveMutation.isPending ? 'Posting…' : 'Approve & Post'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejecting} onClose={() => { setRejecting(null); setRejectReason('') }} title="Reject Payment" size="sm">
        {rejecting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">You are rejecting <strong>{rejecting.member?.full_name}</strong>'s declaration of <strong>{formatCurrency(rejecting.declared_amount)}</strong>. The member will be notified.</p>
            <div>
              <label className="block text-xs font-medium mb-1.5">Reason for Rejection <span className="text-red-500">*</span></label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="e.g. Bank reference not found in statement, amount mismatch…"
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejecting(null); setRejectReason('') }} className="btn-secondary">Cancel</button>
              <button disabled={!rejectReason || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejecting.id, reason: rejectReason })}
                className="btn-danger">
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Approve Confirmation */}
      <ConfirmDialog
        open={confirmingBulk}
        onClose={() => setConfirmingBulk(false)}
        onConfirm={() => bulkApproveMutation.mutate()}
        title={`Approve ${selectedIds.size} payment${selectedIds.size > 1 ? 's' : ''}?`}
        message={`Each will be approved at its own declared amount, totaling ${formatCurrency(selectedTotal)}. If any of these have a discrepancy against the bank statement, deselect them first and approve individually instead.`}
        confirmLabel={`Yes, Approve All ${selectedIds.size}`}
        loading={bulkApproveMutation.isPending}
      />
    </div>
  )
}
