'use client'
import { useState, useRef, useEffect } from 'react'
import { Bell, Receipt, ArrowRight, Menu } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { notificationsApi } from '@/lib/api/notifications'
import { useAuthStore } from '@/lib/stores/auth.store'
import { useUIStore } from '@/lib/stores/ui.store'
import { formatDateTime } from '@/lib/utils/format'

interface Props { title: string; subtitle?: string }

export function TopBar({ title, subtitle }: Props) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: () => notificationsApi.summary(),
    refetchInterval: 60_000,
  })
  const summary = data?.data?.data ?? data?.data
  const pendingPayments = summary?.pending_payments ?? 0
  const unreadNotifications = summary?.unread_notifications ?? 0
  const total = summary?.total ?? 0

  const { data: recentData } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => notificationsApi.list({ limit: 5 }),
    enabled: open,
  })
  const recent = recentData?.data?.data?.data ?? recentData?.data?.data ?? []

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    qc.invalidateQueries({ queryKey: ['notifications-summary'] })
    qc.invalidateQueries({ queryKey: ['notifications-recent'] })
    qc.invalidateQueries({ queryKey: ['notifications-list'] })
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-4"
      style={{ background: '#fff', borderBottom: '1px solid var(--border)', height: '64px' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={toggleMobileNav} className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-50 text-gray-500 flex-shrink-0">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell size={18} className="text-gray-500" />
            {total > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                style={{ background: 'var(--forest)' }}
              >
                {total > 9 ? '9+' : total}
              </span>
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-modal border overflow-hidden z-40"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadNotifications > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs" style={{ color: 'var(--forest)' }}>
                    Mark all read
                  </button>
                )}
              </div>

              {pendingPayments > 0 && (
                <Link href="/payments" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fffbeb' }}>
                    <Receipt size={14} style={{ color: '#d97706' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{pendingPayments} payment{pendingPayments > 1 ? 's' : ''} awaiting verification</p>
                  </div>
                  <ArrowRight size={12} className="text-gray-300" />
                </Link>
              )}

              <div className="max-h-64 overflow-y-auto">
                {recent.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No recent activity</p>
                ) : recent.map((n: any) => (
                  <div key={n.id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)', background: n.is_read ? '#fff' : 'var(--forest-light)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--charcoal)' }}>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                ))}
              </div>

              <Link href="/activity" onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium py-3 hover:bg-gray-50 transition-colors"
                style={{ color: 'var(--forest)' }}>
                View all activity
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: 'var(--gold)' }}
          >
            {user?.full_name?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  )
}
