'use client'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api/reports'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import {
  Users, Wallet, TrendingUp, CreditCard,
  Building2, PieChart, ArrowUpRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportsApi.summary(),
  })

  const summary = data?.data?.data ?? data?.data

  if (isLoading) return (
    <div>
      <TopBar title="Dashboard" subtitle="Executive overview" />
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-forest-900 rounded-full animate-spin" style={{ borderTopColor: 'var(--forest)' }} />
      </div>
    </div>
  )

  const stats = [
    {
      label: 'Total Members',
      value: summary?.membership?.total_members ?? 0,
      sub: `${summary?.membership?.active_members ?? 0} active`,
      icon: Users,
      color: 'var(--forest)',
      bg: 'var(--forest-light)',
    },
    {
      label: 'Total Savings',
      value: formatCurrency(summary?.financials?.total_savings_balance ?? 0),
      sub: `₦${((summary?.financials?.total_contributions_ever ?? 0) / 1_000_000).toFixed(1)}M contributed total`,
      icon: Wallet,
      color: '#0369a1',
      bg: '#f0f9ff',
    },
    {
      label: 'Outstanding Loans',
      value: formatCurrency(summary?.financials?.total_outstanding_loans ?? 0),
      sub: 'Qard Hasan (interest-free)',
      icon: CreditCard,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      label: 'Share Capital',
      value: formatCurrency(summary?.financials?.total_share_capital ?? 0),
      sub: `Assets: ${formatCurrency(summary?.financials?.total_asset_book_value ?? 0)}`,
      icon: PieChart,
      color: '#d97706',
      bg: '#fffbeb',
    },
  ]

  const schemeData = (summary?.scheme_breakdown ?? []).map((s: any) => ({
    name: s.scheme_name.replace(' Savings', ''),
    balance: s.total_balance,
  }))

  return (
    <div>
      <TopBar title="Dashboard" subtitle={`Overview — ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`} />

      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: stat.bg }}
                >
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
                <ArrowUpRight size={14} className="text-gray-300" />
              </div>
              <p className="text-xl font-semibold leading-tight" style={{ color: 'var(--charcoal)' }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Scheme breakdown chart */}
          <div className="card p-5 xl:col-span-2">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>
              Savings by Scheme
            </h3>
            {schemeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={schemeData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Balance']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                  <Bar dataKey="balance" radius={[6, 6, 0, 0]}>
                    {schemeData.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? 'var(--forest)' : i === 1 ? 'var(--gold)' : `hsl(${145 + i * 20}, 45%, ${40 + i * 5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">
                No scheme data yet
              </div>
            )}
          </div>

          {/* Cooperative accounts */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>
              Cooperative Accounts
            </h3>
            <div className="space-y-3">
              {(summary?.cooperative_accounts ?? []).map((acc: any) => (
                <div key={acc.name} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--charcoal)' }}>{acc.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--forest)' }}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              ))}
              {!(summary?.cooperative_accounts?.length) && (
                <p className="text-sm text-gray-400 text-center py-4">No data</p>
              )}
            </div>
          </div>

        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Contributions Ever', value: formatCurrency(summary?.financials?.total_contributions_ever ?? 0), icon: TrendingUp },
            { label: 'Asset Book Value', value: formatCurrency(summary?.financials?.total_asset_book_value ?? 0), icon: Building2 },
            { label: 'Cooperative Funds', value: formatCurrency(summary?.financials?.total_cooperative_funds ?? 0), icon: Wallet },
          ].map((item) => (
            <div key={item.label} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
                <item.icon size={16} style={{ color: 'var(--forest)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>{item.value}</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
