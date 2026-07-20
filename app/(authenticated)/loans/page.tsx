'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansApi } from '@/lib/api/loans'
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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { CreditCard, Plus, CheckCircle2, XCircle, Upload, Archive, X as XIcon } from 'lucide-react'
import type { Loan } from '@/lib/types'

const STATUS_TABS = [
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Active', value: 'active' },
  { label: 'Fully Paid', value: 'fully_paid' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Defaulted', value: 'defaulted' },
  { label: 'All', value: '' },
]

const emptyCreateForm = {
  principal_amount: '',
  monthly_repayment: '',
  due_date: '',
  purpose: '',
}

export default function LoansPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate = user?.role === 'financial_secretary'
  const canApprove = user?.role === 'chairman' || user?.role === 'board_director'

  const [statusFilter, setStatusFilter] = useState('pending_approval')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPurgeQueue, setShowPurgeQueue] = useState(false)

  // Borrower picker
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)

  // Guarantor picker (1 or 2, must differ from borrower and each other)
  const [guarantorSearch, setGuarantorSearch] = useState('')
  const [guarantors, setGuarantors] = useState<any[]>([])

  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [confirmingCreate, setConfirmingCreate] = useState(false)

  const [confirmingApprove, setConfirmingApprove] = useState<Loan | null>(null)
  const [rejecting, setRejecting] = useState<Loan | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: summary } = useQuery({ queryKey: ['loans-summary'], queryFn: () => loansApi.summary() })
  const s = summary?.data?.data ?? summary?.data

  const { data, isLoading } = useQuery({
    queryKey: ['loans', statusFilter, search],
    queryFn: () => loansApi.list({ status: statusFilter || undefined, search: search || undefined }),
  })
  const loans: Loan[] = data?.data?.data ?? data?.data ?? []

  const { data: memberResults } = useQuery({
    queryKey: ['member-search', memberSearch],
    queryFn: () => membersApi.list({ search: memberSearch, limit: 5 }),
    enabled: memberSearch.length > 2 && !selectedMember,
  })
  const memberOptions = memberResults?.data?.data?.data ?? memberResults?.data?.data ?? []

  const { data: guarantorResults } = useQuery({
    queryKey: ['guarantor-search', guarantorSearch],
    queryFn: () => membersApi.list({ search: guarantorSearch, limit: 5 }),
    enabled: guarantorSearch.length > 2 && guarantors.length < 2,
  })
  const guarantorOptions = (guarantorResults?.data?.data?.data ?? guarantorResults?.data?.data ?? [])
    .filter((m: any) => m.id !== selectedMember?.id && !guarantors.some((g) => g.id === m.id))

  const { data: purgeData } = useQuery({
    queryKey: ['loans-purge-eligible'],
    queryFn: () => loansApi.purgeEligible(),
    enabled: showPurgeQueue,
  })
  const purgeEligible = purgeData?.data?.data ?? purgeData?.data ?? { loans: [], retention_years: 2, eligible_count: 0 }

  const resetCreateForm = () => {
    setCreateForm(emptyCreateForm)
    setSelectedMember(null)
    setMemberSearch('')
    setGuarantors([])
    setGuarantorSearch('')
    setDocumentFile(null)
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('member_id', selectedMember.id)
      fd.append('guarantor_member_ids', JSON.stringify(guarantors.map((g) => g.id)))
      fd.append('principal_amount', createForm.principal_amount)
      fd.append('monthly_repayment', createForm.monthly_repayment)
      fd.append('due_date', createForm.due_date)
      if (createForm.purpose) fd.append('purpose', createForm.purpose)
      fd.append('loan_document', documentFile as File)
      return loansApi.create(fd)
    },
    onSuccess: () => {
      toast.success('Loan application submitted — awaiting Chairman/Board Director approval')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['loans-summary'] })
      setShowCreate(false)
      setConfirmingCreate(false)
      resetCreateForm()
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Failed to submit loan application'); setConfirmingCreate(false) },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => loansApi.approve(id),
    onSuccess: () => {
      toast.success('Loan approved and disbursed')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['loans-summary'] })
      setConfirmingApprove(null)
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Could not approve loan'); setConfirmingApprove(null) },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => loansApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Loan application rejected')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['loans-summary'] })
      setRejecting(null)
      setRejectReason('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not reject loan'),
  })

  const purgeMutation = useMutation({
    mutationFn: (id: string) => loansApi.purgeDocument(id),
    onSuccess: () => {
      toast.success('Loan document purged')
      qc.invalidateQueries({ queryKey: ['loans-purge-eligible'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not purge document'),
  })

  const canSubmitCreate = !!selectedMember && guarantors.length >= 1 && guarantors.length <= 2
    && !!createForm.principal_amount && !!createForm.monthly_repayment && !!createForm.due_date && !!documentFile

  return (
    <div>
      <TopBar title="Loans" subtitle="Qard Hasan (interest-free) loan management" />
      <div className="p-6">
        <PageHeader
          title="Loan Register"
          subtitle={canCreate
            ? 'Every application needs 1-2 guarantors, the signed hardcopy form, and a Chairman/Board Director\u2019s approval before it disburses.'
            : canApprove
              ? 'Review and approve or reject loan applications submitted by the Financial Secretary.'
              : 'All loans are interest-free (Qard Hasan). Members may hold more than one active loan at a time.'}
          action={(
            <div className="flex gap-2">
              <button onClick={() => setShowPurgeQueue(true)} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                <Archive size={14} /> Document Retention
              </button>
              {canCreate && (
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5">
                  <Plus size={14} /> New Loan Application
                </button>
              )}
            </div>
          )}
        />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Pending Approval', value: s?.pending_approval_loans ?? 0, cls: 'badge-yellow' },
            { label: 'Active Loans', value: s?.active_loans ?? 0, cls: 'badge-green' },
            { label: 'Total Outstanding', value: formatCurrency(s?.total_outstanding ?? 0), cls: '' },
            { label: 'Fully Paid', value: s?.fully_paid_loans ?? 0, cls: 'badge-green' },
            { label: 'Defaulted', value: s?.defaulted_loans ?? 0, cls: 'badge-red' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-xl font-bold mb-1 ${cls}`} style={!cls ? { color: 'var(--forest)' } : {}}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(({ label, value }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === value ? 'text-white' : 'bg-white text-gray-500 border'}`}
                style={statusFilter === value ? { background: 'var(--forest)' } : { borderColor: 'var(--border)' }}>{label}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search member or MUTAN ID…"
            className="w-full sm:w-64 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }} />
        </div>

        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        : loans.length === 0 ? <div className="card"><EmptyState icon={CreditCard} title="No loans found" /></div>
        : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                    {['Member', 'Guarantors', 'Principal', 'Outstanding', 'Monthly', 'Due Date', 'Status', 'Submitted By', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <tr key={loan.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-xs">{loan.member?.full_name}</p>
                        <p className="text-xs text-gray-400">{loan.member?.mutan_id}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {loan.guarantors?.map(g => g.full_name).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap">{formatCurrency(loan.principal_amount)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: loan.outstanding_balance > 0 ? '#991b1b' : 'var(--forest)' }}>{formatCurrency(loan.outstanding_balance)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatCurrency(loan.monthly_repayment)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(loan.due_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={loan.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{loan.created_by?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {loan.status === 'pending_approval' && canApprove && loan.created_by?.id !== user?.id && (
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmingApprove(loan)} className="text-green-600 hover:text-green-700" title="Approve & disburse">
                              <CheckCircle2 size={16} />
                            </button>
                            <button onClick={() => setRejecting(loan)} className="text-red-600 hover:text-red-700" title="Reject">
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                        {loan.status === 'pending_approval' && loan.created_by?.id === user?.id && (
                          <span className="text-gray-300 italic text-xs">awaiting approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {loans.map(loan => (
                <MobileCard key={loan.id}>
                  <MobileCardHeader
                    title={loan.member?.full_name}
                    subtitle={loan.member?.mutan_id}
                    right={<StatusBadge status={loan.status} />}
                  />
                  <MobileRow label="Guarantors" value={loan.guarantors?.map(g => g.full_name).join(', ') || '—'} />
                  <MobileRow label="Principal" value={<span className="font-semibold">{formatCurrency(loan.principal_amount)}</span>} />
                  <MobileRow label="Outstanding" value={<span style={{ color: loan.outstanding_balance > 0 ? '#991b1b' : 'var(--forest)' }}>{formatCurrency(loan.outstanding_balance)}</span>} />
                  <MobileRow label="Monthly" value={formatCurrency(loan.monthly_repayment)} />
                  <MobileRow label="Due Date" value={formatDate(loan.due_date)} />
                  <MobileRow label="Submitted By" value={loan.created_by?.full_name ?? '—'} />
                  {loan.status === 'pending_approval' && canApprove && loan.created_by?.id !== user?.id && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setConfirmingApprove(loan)} className="btn-primary flex-1 text-xs py-2">Approve</button>
                      <button onClick={() => setRejecting(loan)} className="btn-danger flex-1 text-xs py-2">Reject</button>
                    </div>
                  )}
                </MobileCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Loan Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetCreateForm() }} title="New Loan Application" size="lg">
        <div className="space-y-4">
          {/* Borrower */}
          <FormField label="Borrower" required>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border" style={{ borderColor: 'var(--forest)', background: 'var(--forest-light)' }}>
                <div>
                  <p className="text-sm font-medium">{selectedMember.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedMember.mutan_id}</p>
                </div>
                <button type="button" onClick={() => setSelectedMember(null)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search by name or MUTAN ID…" />
                {memberOptions.length > 0 && memberSearch.length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-10 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    {memberOptions.map((m: any) => (
                      <button key={m.id} type="button" onClick={() => { setSelectedMember(m); setMemberSearch('') }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <p className="font-medium">{m.full_name}</p>
                        <p className="text-xs text-gray-400">{m.mutan_id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormField>

          {/* Guarantors */}
          <FormField label={`Guarantor${guarantors.length !== 1 ? 's' : ''} (1 required, 2 allowed)`} required
            hint="Must be an existing active MUTAN member, and cannot be the borrower.">
            <div className="space-y-1.5 mb-2">
              {guarantors.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs" style={{ borderColor: 'var(--border)' }}>
                  <span>{g.full_name} <span className="text-gray-400">{g.mutan_id}</span></span>
                  <button type="button" onClick={() => setGuarantors(guarantors.filter((x) => x.id !== g.id))} className="text-gray-400 hover:text-red-500">
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            {guarantors.length < 2 && selectedMember && (
              <div className="relative">
                <Input value={guarantorSearch} onChange={e => setGuarantorSearch(e.target.value)} placeholder="Search a guarantor by name or MUTAN ID…" />
                {guarantorOptions.length > 0 && guarantorSearch.length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-10 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    {guarantorOptions.map((m: any) => (
                      <button key={m.id} type="button" onClick={() => { setGuarantors([...guarantors, m]); setGuarantorSearch('') }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <p className="font-medium">{m.full_name}</p>
                        <p className="text-xs text-gray-400">{m.mutan_id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!selectedMember && <p className="text-xs text-gray-400">Select the borrower first.</p>}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Principal Amount (₦)" required>
              <Input type="number" value={createForm.principal_amount} onChange={e => setCreateForm(f => ({ ...f, principal_amount: e.target.value }))} placeholder="100000" />
            </FormField>
            <FormField label="Monthly Repayment (₦)" required>
              <Input type="number" value={createForm.monthly_repayment} onChange={e => setCreateForm(f => ({ ...f, monthly_repayment: e.target.value }))} placeholder="10000" />
            </FormField>
            <FormField label="Due Date" required>
              <Input type="date" value={createForm.due_date} onChange={e => setCreateForm(f => ({ ...f, due_date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Purpose (optional)">
            <Textarea value={createForm.purpose} onChange={e => setCreateForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Medical emergency, school fees" />
          </FormField>

          <FormField label="Filled Loan Form (hardcopy scan or photo)" required hint="JPG, PNG, or PDF — max 10MB. Required before this application can be submitted for approval.">
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs cursor-pointer hover:bg-gray-50" style={{ borderColor: documentFile ? 'var(--forest)' : '#e2e8f0' }}>
              <Upload size={14} />
              {documentFile ? documentFile.name : 'Choose file…'}
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={e => setDocumentFile(e.target.files?.[0] ?? null)} />
            </label>
          </FormField>

          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--forest-light)', color: 'var(--forest)' }}>
            <p className="font-semibold">Qard Hasan — Interest Free</p>
            <p className="text-gray-600 mt-0.5">No interest, in compliance with Islamic financial principles. This submits the application only — a Chairman or Board Director must still approve it before anything disburses. Members may hold more than one active loan at a time.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); resetCreateForm() }} className="btn-secondary">Cancel</button>
            <button type="button" disabled={!canSubmitCreate} onClick={() => setConfirmingCreate(true)} className="btn-primary">
              Review &amp; Submit
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingCreate}
        onClose={() => setConfirmingCreate(false)}
        onConfirm={() => createMutation.mutate()}
        title="Submit this loan application?"
        message={selectedMember ? `This submits a ₦${Number(createForm.principal_amount || 0).toLocaleString()} loan application for ${selectedMember.full_name}, guaranteed by ${guarantors.map(g => g.full_name).join(' and ')}. Nothing disburses until a Chairman or Board Director approves it.` : ''}
        confirmLabel="Yes, Submit"
        loading={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmingApprove}
        onClose={() => setConfirmingApprove(null)}
        onConfirm={() => confirmingApprove && approveMutation.mutate(confirmingApprove.id)}
        title="Approve & disburse this loan?"
        message={confirmingApprove ? `This disburses ₦${confirmingApprove.principal_amount.toLocaleString()} to ${confirmingApprove.member?.full_name} immediately. This cannot be undone from here.` : ''}
        confirmLabel="Yes, Approve & Disburse"
        loading={approveMutation.isPending}
      />

      <Modal open={!!rejecting} onClose={() => { setRejecting(null); setRejectReason('') }} title="Reject Loan Application" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Rejecting the ₦{rejecting?.principal_amount.toLocaleString()} application for {rejecting?.member?.full_name}.
          </p>
          <FormField label="Reason for rejection" required>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Guarantor is not in good standing — please resubmit with an alternative guarantor." />
          </FormField>
          <button
            onClick={() => rejecting && rejectMutation.mutate({ id: rejecting.id, reason: rejectReason })}
            disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
            className="btn-danger w-full"
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject Application'}
          </button>
        </div>
      </Modal>

      {/* Document Retention Modal */}
      <Modal open={showPurgeQueue} onClose={() => setShowPurgeQueue(false)} title="Loan Document Retention" size="lg">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Fully-paid loans keep their hardcopy scan on file for {purgeEligible.retention_years} year(s) after the loan is cleared. Once that window passes, any admin can purge the document — the loan's financial record is never deleted, only the scan.
          </p>
          {purgeEligible.loans?.length === 0 ? (
            <EmptyState icon={Archive} title="Nothing eligible yet" description="Loans will appear here once fully paid and past the retention window." />
          ) : (
            <div className="space-y-2">
              {purgeEligible.loans?.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="font-medium">{l.member?.full_name} <span className="text-gray-400">{l.member?.mutan_id}</span></p>
                    <p className="text-gray-400">Principal {formatCurrency(l.principal_amount)} · fully paid {formatDateTime(l.fully_paid_at)}</p>
                  </div>
                  <button onClick={() => purgeMutation.mutate(l.id)} disabled={purgeMutation.isPending} className="btn-danger text-xs py-1.5 px-3">
                    Purge Document
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
