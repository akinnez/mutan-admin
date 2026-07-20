'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api/notifications'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { Activity, CheckCircle2, Circle } from 'lucide-react'

const TYPE_LABEL: Record<string, string> = {
  scheme_join: 'Joined Scheme',
  scheme_amount_change: 'Changed Contribution',
  scheme_pause: 'Paused Contributions',
  scheme_resume: 'Resumed Contributions',
  scheme_exit: 'Exited Scheme',
}

export default function ActivityPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-list', page, unreadOnly, typeFilter],
    queryFn: () => notificationsApi.list({ page, limit: 20, unread_only: unreadOnly, type: typeFilter || undefined }),
  })
  const result = data?.data?.data ?? data?.data
  const notifications = result?.data ?? []
  const totalPages = result?.total_pages ?? 1

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-list'] })
      qc.invalidateQueries({ queryKey: ['notifications-summary'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      qc.invalidateQueries({ queryKey: ['notifications-list'] })
      qc.invalidateQueries({ queryKey: ['notifications-summary'] })
    },
  })

  return (
    <div>
      <TopBar title="Activity" subtitle="Member-initiated scheme changes" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Activity Feed"
          subtitle="Every scheme join, pause, resume, exit, or contribution change a member makes on their own account"
          action={
            <div className="flex items-center gap-3">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }}>
                <option value="">All Types</option>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => setUnreadOnly(u => !u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${unreadOnly ? '' : 'text-gray-500'}`}
                style={unreadOnly ? { background: 'var(--forest-light)', color: 'var(--forest)', borderColor: 'var(--forest)' } : { borderColor: 'var(--border)' }}
              >
                Unread only
              </button>
              <button onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}
                className="btn-secondary text-xs py-2 px-3">
                Mark all read
              </button>
            </div>
          }
        />

        <div className="card overflow-hidden">
          {isLoading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Member-initiated scheme changes will appear here." />
          ) : (
            <div>
              {notifications.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                  className="w-full flex items-start gap-3 px-5 py-4 border-b last:border-0 text-left transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', background: n.is_read ? '#fff' : 'var(--forest-light)' }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {n.is_read
                      ? <CheckCircle2 size={16} className="text-gray-300" />
                      : <Circle size={16} style={{ color: 'var(--forest)' }} fill="var(--forest)" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="badge-gray px-2 py-0.5 rounded-full text-xs font-medium">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {n.member?.mutan_id && (
                        <span className="text-xs text-gray-400 font-mono">{n.member.mutan_id}</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--charcoal)' }}>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-xs py-2 px-3 disabled:opacity-40">
              Previous
            </button>
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary text-xs py-2 px-3 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
