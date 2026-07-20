'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { sharesApi } from '@/lib/api/shares'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils/format'
import { Landmark, GraduationCap, ChevronRight } from 'lucide-react'

export default function SharesLandingPage() {
  const router = useRouter()

  const { data: mutanData, isLoading: mutanLoading } = useQuery({
    queryKey: ['shares-register', 'mutan'],
    queryFn: () => sharesApi.getRegister('mutan'),
  })
  const { data: cbtData, isLoading: cbtLoading } = useQuery({
    queryKey: ['shares-register', 'cbt'],
    queryFn: () => sharesApi.getRegister('cbt'),
  })

  const mutan = mutanData?.data?.data ?? mutanData?.data
  const cbt = cbtData?.data?.data ?? cbtData?.data

  const cards = [
    {
      type: 'mutan',
      title: 'MUTAN Shares',
      subtitle: 'General cooperative equity — admin-recorded purchases, dividend-bearing, subject to the 20% legal cap',
      icon: Landmark,
      loading: mutanLoading,
      totalValue: mutan?.total_share_capital,
      totalUnits: mutan?.total_units_issued,
      memberCount: mutan?.members?.length ?? 0,
      unitLabel: 'units issued',
    },
    {
      type: 'cbt',
      title: 'CBT Shares',
      subtitle: 'Funded automatically through the monthly levy — halts per member once their cap is reached',
      icon: GraduationCap,
      loading: cbtLoading,
      totalValue: cbt?.total_units_issued, // 1 unit = ₦1 for CBT, so units_issued IS the naira total
      totalUnits: null,
      memberCount: cbt?.members?.length ?? 0,
      unitLabel: null,
    },
  ]

  return (
    <div>
      <TopBar title="Shares" subtitle="MUTAN and CBT share capital" />
      <div className="p-6 space-y-6">
        <PageHeader title="Shares" subtitle="Tap a card to view holdings, settings, and transaction history for that share type." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((c) => (
            <button
              key={c.type}
              onClick={() => router.push(`/shares/${c.type}`)}
              className="card p-6 text-left hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl" style={{ background: 'var(--forest-light)' }}>
                  <c.icon size={22} style={{ color: 'var(--forest)' }} />
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-2" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{c.title}</h3>
              <p className="text-xs text-gray-400 mb-5">{c.subtitle}</p>

              {c.loading ? (
                <p className="text-xs text-gray-300">Loading…</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--forest-light)' }}>
                    <p className="text-xs text-gray-500 mb-0.5">Total Value</p>
                    <p className="text-base font-bold" style={{ color: 'var(--forest)' }}>{formatCurrency(c.totalValue ?? 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--forest-light)' }}>
                    <p className="text-xs text-gray-500 mb-0.5">Shareholders</p>
                    <p className="text-base font-bold" style={{ color: 'var(--forest)' }}>{c.memberCount}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
