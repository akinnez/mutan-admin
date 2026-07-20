'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api/reports'
import { schemesApi } from '@/lib/api/schemes'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField, Select } from '@/components/shared/FormField'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { useDownload } from '@/lib/hooks/useDownload'
import toast from 'react-hot-toast'
import {
  BarChart3, Download, Users, FileSpreadsheet,
  Award, Shield, BookOpen, CalendarRange,
} from 'lucide-react'

const MONTHLY_CATEGORIES = [
  { value: 'contribution_adjustments', label: 'Contribution Adjustments' },
  { value: 'exit_pause_stop', label: 'Exit / Pause / Stop' },
  { value: 'loan_repayment', label: 'Loan Repayment' },
  { value: 'investments', label: 'Investments' },
  { value: 'shares', label: 'Shares' },
  { value: 'organizational_ledger', label: 'Organizational Ledger' },
]

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ReportsPage() {
  const { download } = useDownload()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [monthlyCategory, setMonthlyCategory] = useState(MONTHLY_CATEGORIES[0].value)
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonthValue())

  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => reportsApi.summary() })
  const s = summary?.data?.data ?? summary?.data

  const { data: schemesData } = useQuery({ queryKey: ['schemes'], queryFn: () => schemesApi.list() })
  const schemes = schemesData?.data?.data ?? schemesData?.data ?? []

  const [auditTableFilter, setAuditTableFilter] = useState('')
  const [auditFromDate, setAuditFromDate] = useState('')
  const [auditToDate, setAuditToDate] = useState('')
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-log', auditTableFilter, auditFromDate, auditToDate],
    queryFn: () => reportsApi.auditLog({
      table_name: auditTableFilter || undefined,
      from_date: auditFromDate || undefined,
      to_date: auditToDate || undefined,
    }),
  })
  const logs = auditData?.data?.data ?? auditData?.data ?? []

  const dl = async (key: string, fn: () => Promise<any>, filename: string) => {
    setDownloading(key)
    try {
      const res = await fn()
      download(new Blob([res.data], { type: res.headers['content-type'] }), filename)
      toast.success(`${filename} downloaded`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const generateMonthly = () => dl(
    'monthly',
    () => reportsApi.downloadMonthly(monthlyCategory, monthlyMonth),
    `mutan-${monthlyCategory}-${monthlyMonth}.xlsx`,
  )

  const today = new Date().toISOString().split('T')[0]

  const reportCards = [
    {
      key: 'members',
      title: 'Member Ledger',
      desc: 'Full member list with all wallet balances, loans, and share holdings',
      icon: Users,
      color: 'var(--forest)',
      bg: 'var(--forest-light)',
      action: () => dl('members', () => reportsApi.downloadMembers(), `mutan-member-ledger-${today}.xlsx`),
    },
    {
      key: 'agm',
      title: 'AGM Report',
      desc: '7-sheet executive report: summary, schemes, loans, shares, assets, batches, coop accounts',
      icon: Award,
      color: '#d97706',
      bg: '#fffbeb',
      action: () => dl('agm', () => reportsApi.downloadAgm(), `mutan-agm-report-${today}.xlsx`),
    },
  ]

  return (
    <div>
      <TopBar title="Reports" subtitle="Download and view cooperative reports" />
      <div className="p-6 space-y-6">
        <PageHeader title="Reports & Exports" subtitle="All reports are generated in real-time" />

        {/* Quick stats */}
        {s && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Active Members', value: s.membership?.active_members },
              { label: 'Total Savings', value: formatCurrency(s.financials?.total_savings_balance) },
              { label: 'Outstanding Loans', value: formatCurrency(s.financials?.total_outstanding_loans) },
              { label: 'Share Capital', value: formatCurrency(s.financials?.total_share_capital) },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-xl font-bold mb-1" style={{ color: 'var(--forest)' }}>{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Report downloads */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--charcoal)' }}>Downloadable Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {reportCards.map(({ key, title, desc, icon: Icon, color, bg, action }) => (
              <div key={key} className="card p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
                  <p className="text-xs text-gray-400 mb-3">{desc}</p>
                  <button onClick={action} disabled={downloading === key}
                    className="btn-primary flex items-center gap-2 py-2 text-xs">
                    {downloading === key
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Download size={12} />}
                    {downloading === key ? 'Generating…' : 'Download Excel'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly categorized reports — admin picks ONE category per generation */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
                <CalendarRange size={16} style={{ color: 'var(--forest)' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Monthly Reports</h4>
                <p className="text-xs text-gray-400">Pick a category and month — each generates its own separate file</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <FormField label="Category">
                <Select value={monthlyCategory} onChange={e => setMonthlyCategory(e.target.value)}>
                  {MONTHLY_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Month">
                <input type="month" value={monthlyMonth} onChange={e => setMonthlyMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white" style={{ borderColor: '#e2e8f0' }} />
              </FormField>
              <button onClick={generateMonthly} disabled={downloading === 'monthly'}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm">
                {downloading === 'monthly'
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Download size={14} />}
                {downloading === 'monthly' ? 'Generating…' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Per-scheme reports */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
                <BookOpen size={16} style={{ color: 'var(--forest)' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Per-Scheme Reports</h4>
                <p className="text-xs text-gray-400">Download a balance report for any individual scheme</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {schemes.map((scheme: any) => (
                <button key={scheme.id}
                  onClick={() => dl(`scheme-${scheme.id}`, () => reportsApi.downloadScheme(scheme.id), `mutan-scheme-${scheme.name.replace(/\s+/g, '-').toLowerCase()}-${today}.xlsx`)}
                  disabled={!!downloading}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--border)' }}>
                  <FileSpreadsheet size={13} style={{ color: 'var(--forest)' }} />
                  <span className="text-xs truncate">{scheme.name}</span>
                  {downloading === `scheme-${scheme.id}` && <span className="w-3 h-3 border border-gray-300 border-t-forest-900 rounded-full animate-spin ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
              <Shield size={16} style={{ color: 'var(--forest)' }} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Admin Audit Log</h4>
              <p className="text-xs text-gray-400">Last 100 admin actions</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <select value={auditTableFilter} onChange={e => setAuditTableFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }}>
              <option value="">All Tables</option>
              {['manual_payments', 'loans', 'member_subscriptions', 'members', 'shares', 'investment_rounds', 'fixed_assets', 'levy_types', 'schemes', 'upload_batches', 'upload_rows', 'monthly_lock_settings', 'share_settings'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input type="date" value={auditFromDate} onChange={e => setAuditFromDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={auditToDate} onChange={e => setAuditToDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
            {(auditTableFilter || auditFromDate || auditToDate) && (
              <button onClick={() => { setAuditTableFilter(''); setAuditFromDate(''); setAuditToDate('') }}
                className="text-xs" style={{ color: 'var(--forest)' }}>
                Clear
              </button>
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                  {['Admin', 'Action', 'Table', 'When'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr><td colSpan={4} className='text-center py-6 text-gray-400'>Loading audit log…</td></tr>
                ) : logs.slice(0, 100).map((log: any) => (
                  <tr key={log.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{log.admin}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="badge-gray px-2 py-0.5 rounded-full font-mono">{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{log.table}</td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
                {!auditLoading && !logs.length && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No audit logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5 max-h-96 overflow-y-auto p-3">
            {auditLoading ? (
              <p className="text-center py-6 text-gray-400 text-xs">Loading audit log…</p>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-xs">No audit logs yet</p>
            ) : logs.slice(0, 100).map((log: any) => (
              <MobileCard key={log.id} className="p-3">
                <MobileCardHeader
                  title={log.admin}
                  subtitle={formatDateTime(log.created_at)}
                  right={<span className="badge-gray px-2 py-0.5 rounded-full font-mono text-xs">{log.action.replace(/_/g, ' ')}</span>}
                />
                <MobileRow label="Table" value={log.table} />
              </MobileCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
