'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ledgerApi } from '@/lib/api/ledger'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { Landmark, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  operational: 'Operational',
  reserve: 'Reserve',
  development: 'Development',
  investment: 'Investment',
  welfare: 'Welfare',
}

export default function LedgerPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [accountFilter, setAccountFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [form, setForm] = useState({
    account_id: '',
    type: 'credit' as 'credit' | 'debit',
    amount: '',
    board_resolution_reference: '',
    reason: '',
  })

  const { data: accountsData } = useQuery({ queryKey: ['coop-accounts'], queryFn: () => ledgerApi.accounts() })
  const accounts = accountsData?.data?.data ?? accountsData?.data ?? []

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['ledger-entries', accountFilter, fromDate, toDate],
    queryFn: () => ledgerApi.list({
      account_id: accountFilter || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
  })
  const entries = entriesData?.data?.data ?? entriesData?.data ?? []

  const createMutation = useMutation({
    mutationFn: () => ledgerApi.create({
      account_id: form.account_id,
      type: form.type,
      amount: parseFloat(form.amount),
      board_resolution_reference: form.board_resolution_reference,
      reason: form.reason,
    }),
    onSuccess: () => {
      toast.success('Ledger entry recorded')
      qc.invalidateQueries({ queryKey: ['ledger-entries'] })
      qc.invalidateQueries({ queryKey: ['coop-accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setShowForm(false)
      setConfirming(false)
      setForm({ account_id: '', type: 'credit', amount: '', board_resolution_reference: '', reason: '' })
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? 'Could not record entry')
      setConfirming(false)
    },
  })

  const selectedAccount = accounts.find((a: any) => a.id === form.account_id)
  const canSubmit = form.account_id && form.amount && parseFloat(form.amount) > 0 &&
    form.board_resolution_reference.trim() && form.reason.trim()

  return (
    <div>
      <TopBar title="Organizational Ledger" subtitle="Board-approved movements against MUTAN's own accounts" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Organizational Ledger"
          subtitle="Every debit or credit here moves money in or out of a cooperative account — never an individual member's wallet"
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5">
              <Plus size={14} /> New Entry
            </button>
          }
        />

        {/* Account balances */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {accounts.map((a: any) => (
            <button key={a.id} onClick={() => setAccountFilter(accountFilter === a.id ? '' : a.id)}
              className="card p-4 text-left transition-all"
              style={accountFilter === a.id ? { borderColor: 'var(--forest)', boxShadow: '0 0 0 1px var(--forest)' } : {}}>
              <p className="text-xs text-gray-400 mb-1">{ACCOUNT_TYPE_LABEL[a.account_type] ?? a.account_type}</p>
              <p className="text-sm font-bold" style={{ color: 'var(--forest)' }}>{formatCurrency(a.balance)}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{a.name}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
          {(accountFilter || fromDate || toDate) && (
            <button onClick={() => { setAccountFilter(''); setFromDate(''); setToDate('') }} className="text-xs" style={{ color: 'var(--forest)' }}>
              Clear all filters
            </button>
          )}
        </div>

        {/* Ledger entries */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading…</p>
          ) : entries.length === 0 ? (
            <EmptyState icon={Landmark} title="No ledger entries yet"
              description="Board-approved debits and credits against cooperative accounts will appear here." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Account', 'Type', 'Amount', 'Board Resolution', 'Reason', 'Balance After', 'Logged By'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e: any) => (
                      <tr key={e.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{e.account?.name}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {e.type === 'credit'
                              ? <ArrowUpRight size={12} className="text-green-600" />
                              : <ArrowDownRight size={12} className="text-red-600" />}
                            <span className={e.type === 'credit' ? 'badge-green' : 'badge-red'} style={{ padding: '2px 8px', borderRadius: '999px' }}>
                              {e.type}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(e.amount)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500 whitespace-nowrap">{e.board_resolution_reference}</td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{e.reason}</td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatCurrency(e.balance_after)}</td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{e.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {entries.map((e: any) => (
                  <MobileCard key={e.id}>
                    <MobileCardHeader
                      title={e.account?.name}
                      subtitle={formatDateTime(e.created_at)}
                      right={
                        <span className="flex items-center gap-1">
                          {e.type === 'credit'
                            ? <ArrowUpRight size={12} className="text-green-600" />
                            : <ArrowDownRight size={12} className="text-red-600" />}
                          <span className={e.type === 'credit' ? 'badge-green' : 'badge-red'} style={{ padding: '2px 8px', borderRadius: '999px' }}>
                            {e.type}
                          </span>
                        </span>
                      }
                    />
                    <MobileRow label="Amount" value={<span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(e.amount)}</span>} />
                    <MobileRow label="Board Resolution" value={<span className="font-mono">{e.board_resolution_reference}</span>} />
                    <MobileRow label="Balance After" value={formatCurrency(e.balance_after)} />
                    <MobileRow label="Logged By" value={e.created_by} />
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>{e.reason}</p>
                  </MobileCard>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Entry Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Ledger Entry">
        <div className="space-y-4">
          <FormField label="Cooperative Account" required>
            <Select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">Select account…</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Movement Type" required>
            <div className="grid grid-cols-2 gap-2">
              {(['credit', 'debit'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm capitalize transition-all"
                  style={{
                    borderColor: form.type === t ? 'var(--forest)' : '#e2e8f0',
                    background: form.type === t ? 'var(--forest-light)' : '#fff',
                    color: form.type === t ? 'var(--forest)' : 'var(--charcoal)',
                  }}>
                  {t === 'credit' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {t}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Amount (₦)" required>
            <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 150000" />
          </FormField>

          <FormField label="Board Resolution Reference" required
            hint="Every entry must be tied to a board resolution from a general meeting.">
            <Input value={form.board_resolution_reference}
              onChange={e => setForm(f => ({ ...f, board_resolution_reference: e.target.value }))}
              placeholder="e.g. BR-2026-014" />
          </FormField>

          <FormField label="Reason" required>
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. AGM-approved bulk purchase of classroom materials" />
          </FormField>

          <button onClick={() => setConfirming(true)} disabled={!canSubmit}
            className="btn-primary flex items-center justify-center gap-2">
            Continue
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => createMutation.mutate()}
        title={`Confirm ${form.type}?`}
        message={`This will ${form.type} ${form.amount ? formatCurrency(parseFloat(form.amount)) : ''} against ${selectedAccount?.name ?? 'the selected account'}, citing board resolution "${form.board_resolution_reference}". This cannot be undone.`}
        confirmLabel={`Yes, Record ${form.type === 'credit' ? 'Credit' : 'Debit'}`}
        variant={form.type === 'debit' ? 'danger' : 'primary'}
        loading={createMutation.isPending}
      />
    </div>
  )
}
