'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reconciliationApi } from '@/lib/api/reconciliation'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw,
  Wallet, Landmark, Receipt,
} from 'lucide-react'

const SOURCE_LABEL: Record<string, string> = {
  manual_payment: 'Manual Payment',
  paystack_transaction: 'Pay Direct',
  upload_batch_row: 'Batch Upload',
}

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ReconciliationPage() {
  const [month, setMonth] = useState(currentMonthValue())

  const { data: reportData, isLoading: reportLoading, refetch, isFetching } = useQuery({
    queryKey: ['reconciliation-report'],
    queryFn: () => reconciliationApi.getReport(),
  })
  const report = reportData?.data?.data ?? reportData?.data

  const { data: receiptsData, isLoading: receiptsLoading } = useQuery({
    queryKey: ['cash-receipts', month],
    queryFn: () => reconciliationApi.getCashReceipts(month),
  })
  const receipts = receiptsData?.data?.data ?? receiptsData?.data

  return (
    <div>
      <TopBar title="Reconciliation" subtitle="Proves the books actually balance, instead of assuming they do" />
      <div className="p-6 space-y-8">

        {/* ── Integrity check ──────────────────────────────────────────── */}
        <div>
          <PageHeader
            title="Integrity Check"
            subtitle="Compares every wallet's and cooperative account's stored balance against what its own transaction log sums to"
            action={
              <button onClick={() => refetch()} disabled={isFetching}
                className="btn-secondary flex items-center gap-2 text-sm py-2.5" style={{ width: 'auto' }}>
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Re-run Check
              </button>
            }
          />

          {reportLoading ? (
            <p className="text-center py-10 text-sm text-gray-400">Running check…</p>
          ) : report && (
            <div className="mt-4 space-y-4">
              {/* Overall status banner */}
              <div
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: report.overall_consistent ? 'var(--forest-light)' : '#fee2e2' }}
              >
                {report.overall_consistent
                  ? <CheckCircle2 size={28} style={{ color: 'var(--forest)' }} />
                  : <AlertTriangle size={28} style={{ color: '#991b1b' }} />}
                <div>
                  <p className="font-semibold text-sm" style={{ color: report.overall_consistent ? 'var(--forest)' : '#991b1b' }}>
                    {report.overall_consistent ? 'Everything balances' : 'Discrepancies found — see below'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Checked {formatDateTime(report.generated_at)}
                  </p>
                </div>
              </div>

              {/* Two summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} style={{ color: 'var(--forest)' }} />
                    <h4 className="font-semibold text-sm">Member Wallets</h4>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Checked</span>
                    <span className="font-medium">{report.wallets.total_checked}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-gray-400">Mismatches</span>
                    <span className="font-semibold" style={{ color: report.wallets.mismatches_found > 0 ? '#991b1b' : 'var(--forest)' }}>
                      {report.wallets.mismatches_found}
                    </span>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark size={16} style={{ color: 'var(--forest)' }} />
                    <h4 className="font-semibold text-sm">Cooperative Accounts</h4>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Checked</span>
                    <span className="font-medium">{report.cooperative_accounts.total_checked}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-gray-400">Mismatches</span>
                    <span className="font-semibold" style={{ color: report.cooperative_accounts.mismatches_found > 0 ? '#991b1b' : 'var(--forest)' }}>
                      {report.cooperative_accounts.mismatches_found}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet mismatch detail */}
              {report.wallets.mismatches.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: '#fee2e2' }}>
                    <h4 className="font-semibold text-sm" style={{ color: '#991b1b' }}>Wallet Discrepancies</h4>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                          {['Member', 'Scheme', 'Stored', 'Computed', 'Discrepancy'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.wallets.mismatches.map((m: any) => (
                          <tr key={m.wallet_id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <p className="font-medium">{m.member_name}</p>
                              <p className="text-gray-400 font-mono">{m.mutan_id}</p>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{m.scheme_name}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatCurrency(m.stored_balance)}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatCurrency(m.computed_balance)}</td>
                            <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: '#991b1b' }}>
                              {m.discrepancy > 0 ? '+' : ''}{formatCurrency(m.discrepancy)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                    {report.wallets.mismatches.map((m: any) => (
                      <div key={m.wallet_id} className="p-4 text-xs space-y-1">
                        <p className="font-medium text-sm">{m.member_name} <span className="text-gray-400 font-mono">({m.mutan_id})</span></p>
                        <p className="text-gray-500">{m.scheme_name}</p>
                        <div className="flex justify-between"><span className="text-gray-400">Stored</span><span>{formatCurrency(m.stored_balance)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Computed</span><span>{formatCurrency(m.computed_balance)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Discrepancy</span><span className="font-semibold" style={{ color: '#991b1b' }}>{formatCurrency(m.discrepancy)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cooperative account mismatch detail */}
              {report.cooperative_accounts.mismatches.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: '#fee2e2' }}>
                    <h4 className="font-semibold text-sm" style={{ color: '#991b1b' }}>Cooperative Account Discrepancies</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                          {['Account', 'Type', 'Stored', 'Computed', 'Discrepancy'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.cooperative_accounts.mismatches.map((m: any) => (
                          <tr key={m.account_id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">{m.account_name}</td>
                            <td className="px-4 py-2.5 capitalize whitespace-nowrap">{m.account_type}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatCurrency(m.stored_balance)}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatCurrency(m.computed_balance)}</td>
                            <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: '#991b1b' }}>
                              {m.discrepancy > 0 ? '+' : ''}{formatCurrency(m.discrepancy)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cash receipts ────────────────────────────────────────────── */}
        <div>
          <PageHeader
            title="Cash Receipts"
            subtitle="The number to check against the real bank statement — gross cash received this month, and exactly where it went"
            action={
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-2.5 rounded-xl border text-sm bg-white" style={{ borderColor: '#e2e8f0' }} />
            }
          />

          {receiptsLoading ? (
            <p className="text-center py-10 text-sm text-gray-400 mt-4">Loading…</p>
          ) : receipts && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Gross Received', value: receipts.totals.gross, color: 'var(--forest)' },
                  { label: 'Levies', value: receipts.totals.levy, color: 'var(--charcoal)' },
                  { label: 'Loan Repayment', value: receipts.totals.loan, color: 'var(--charcoal)' },
                  { label: 'Savings', value: receipts.totals.savings, color: 'var(--charcoal)' },
                ].map(t => (
                  <div key={t.label} className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">{t.label}</p>
                    <p className="text-base font-bold" style={{ color: t.color }}>{formatCurrency(t.value)}</p>
                  </div>
                ))}
              </div>

              <div className="card overflow-hidden">
                {receipts.entries.length === 0 ? (
                  <EmptyState icon={Receipt} title="No cash receipts this month"
                    description="Entries appear here as payments are processed, whichever path they took." />
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                            {['Date', 'Member', 'Source', 'Gross', 'Levy', 'Loan', 'Savings'].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {receipts.entries.map((e: any) => (
                            <tr key={e.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <p className="font-medium">{e.member_name}</p>
                                <p className="text-gray-400 font-mono">{e.mutan_id}</p>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className="badge-gray px-2 py-0.5 rounded-full text-xs">{SOURCE_LABEL[e.source_type] ?? e.source_type}</span>
                              </td>
                              <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{formatCurrency(e.gross_amount)}</td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{Number(e.levy_portion) > 0 ? formatCurrency(e.levy_portion) : '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{Number(e.loan_repayment_portion) > 0 ? formatCurrency(e.loan_repayment_portion) : '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{Number(e.savings_portion) > 0 ? formatCurrency(e.savings_portion) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                      {receipts.entries.map((e: any) => (
                        <div key={e.id} className="p-4 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{e.member_name}</p>
                              <p className="text-gray-400 font-mono">{e.mutan_id}</p>
                            </div>
                            <span className="badge-gray px-2 py-0.5 rounded-full text-xs">{SOURCE_LABEL[e.source_type] ?? e.source_type}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-gray-400">Gross</span><span className="font-semibold" style={{ color: 'var(--forest)' }}>{formatCurrency(e.gross_amount)}</span></div>
                          {Number(e.levy_portion) > 0 && <div className="flex justify-between"><span className="text-gray-400">Levy</span><span>{formatCurrency(e.levy_portion)}</span></div>}
                          {Number(e.loan_repayment_portion) > 0 && <div className="flex justify-between"><span className="text-gray-400">Loan</span><span>{formatCurrency(e.loan_repayment_portion)}</span></div>}
                          {Number(e.savings_portion) > 0 && <div className="flex justify-between"><span className="text-gray-400">Savings</span><span>{formatCurrency(e.savings_portion)}</span></div>}
                          <p className="text-gray-400 pt-1">{formatDateTime(e.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
