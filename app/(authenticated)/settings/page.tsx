'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api/settings'
import { authApi } from '@/lib/api/auth'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Modal } from '@/components/shared/Modal'
import { FormField, Input } from '@/components/shared/FormField'
import { formatDate } from '@/lib/utils/format'
import { useAuthStore } from '@/lib/stores/auth.store'
import toast from 'react-hot-toast'
import { Lock, Unlock, Calendar, Key, Shield, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [showLock, setShowLock] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [lockDay, setLockDay] = useState('20')
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lock-settings'],
    queryFn: () => settingsApi.getLock(),
  })
  const lock = data?.data?.data ?? data?.data

  const lockDayMutation = useMutation({
    mutationFn: (lock_day: number) => settingsApi.updateLock({ lock_day }),
    onSuccess: () => { toast.success('Lock day updated'); refetch() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const lockMutation = useMutation({
    mutationFn: () => settingsApi.updateLock({ is_locked: true }),
    onSuccess: () => { toast.success('Subscription window locked — reconciliation can proceed'); refetch(); setShowLock(false) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const unlockMutation = useMutation({
    mutationFn: () => settingsApi.updateLock({ is_locked: false }),
    onSuccess: () => { toast.success('Subscription window unlocked — members can update preferences'); refetch(); setShowUnlock(false) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
    onSuccess: () => { toast.success('Password changed successfully'); setShowChangePw(false); setPwForm({ current_password: '', new_password: '', confirm: '' }) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const handleChangePw = () => {
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    if (pwForm.new_password.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwError('')
    changePwMutation.mutate()
  }

  return (
    <div>
      <TopBar title="Settings" subtitle="System configuration" />
      <div className="p-6 space-y-5">
        <PageHeader title="System Settings" />

        {/* Monthly Lock Settings */}
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
              <Calendar size={18} style={{ color: 'var(--forest)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5">Monthly Subscription Lock</h3>
              <p className="text-xs text-gray-400">Controls when members can update their subscription preferences. Lock before running monthly reconciliation.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-12 flex items-center"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
          ) : (
            <div className="space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: lock?.is_locked ? '#991b1b' : '#0F5132', background: lock?.is_locked ? '#fef2f2' : 'var(--forest-light)' }}>
                <div className="flex items-center gap-3">
                  {lock?.is_locked
                    ? <Lock size={18} style={{ color: '#991b1b' }} />
                    : <Unlock size={18} style={{ color: 'var(--forest)' }} />}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: lock?.is_locked ? '#991b1b' : 'var(--forest)' }}>
                      {lock?.is_locked ? 'Subscriptions Locked' : 'Subscriptions Open'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lock?.current_lock_date && `Lock date: ${formatDate(lock.current_lock_date)}`}
                      {lock?.window_open_date && ` · Reopens: ${formatDate(lock.window_open_date)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => lock?.is_locked ? setShowUnlock(true) : setShowLock(true)}
                  className={lock?.is_locked ? 'btn-secondary' : 'btn-primary'}
                >
                  {lock?.is_locked ? 'Unlock Window' : 'Lock Window'}
                </button>
              </div>

              {/* Lock day config */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5">Monthly Lock Day</label>
                  <input type="number" min={1} max={28} value={lockDay} onChange={e => setLockDay(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
                  <p className="text-xs text-gray-400 mt-1">
                    Subscriptions lock on the {lockDay}th of each month. Upload window opens on the {parseInt(lockDay) + 1}th of the previous month.
                  </p>
                </div>
                <button
                  onClick={() => lockDayMutation.mutate(parseInt(lockDay))}
                  disabled={lockDayMutation.isPending}
                  className="btn-secondary whitespace-nowrap">
                  {lockDayMutation.isPending ? 'Saving…' : 'Update Lock Day'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Security */}
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
              <Shield size={18} style={{ color: 'var(--forest)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5">Account Security</h3>
              <p className="text-xs text-gray-400">Manage your admin account credentials</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--forest-light)' }}>
              <div>
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.phone_number} · {user?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <button onClick={() => setShowChangePw(true)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-sm text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Key size={15} style={{ color: 'var(--forest)' }} />
              <div>
                <p className="font-medium text-xs">Change Password</p>
                <p className="text-xs text-gray-400">Update your login password</p>
              </div>
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--forest)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5">System Information</h3>
              <p className="text-xs text-gray-400">MUTAN Cooperative Management Platform</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ['Platform', 'MUTAN Cooperative Society'],
              ['Version', '1.0.0'],
              ['Architecture', 'Non-Custodial Ledger (CBN Compliant)'],
              ['Financial Framework', 'Shariah-Compliant (Riba-Free)'],
              ['API', process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--border)' }}>
                <span className="text-gray-400">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={showChangePw} onClose={() => { setShowChangePw(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); setPwError('') }} title="Change Password" size="sm">
        <div className="space-y-4">
          <FormField label="Current Password" required>
            <Input type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
          </FormField>
          <FormField label="New Password" required hint="Minimum 8 characters, must include uppercase, lowercase and number">
            <Input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
          </FormField>
          <FormField label="Confirm New Password" required error={pwError}>
            <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setShowChangePw(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); setPwError('') }} className="btn-secondary">Cancel</button>
            <button onClick={handleChangePw} disabled={!pwForm.current_password || !pwForm.new_password || changePwMutation.isPending} className="btn-primary">
              {changePwMutation.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={showLock} onClose={() => setShowLock(false)}
        onConfirm={() => lockMutation.mutate()} loading={lockMutation.isPending}
        title="Lock Subscription Window"
        message="Members will not be able to update their subscription preferences until you unlock the window. Do this before running monthly reconciliation." confirmLabel="Lock Window" />

      <ConfirmDialog open={showUnlock} onClose={() => setShowUnlock(false)}
        onConfirm={() => unlockMutation.mutate()} loading={unlockMutation.isPending}
        title="Unlock Subscription Window"
        message="Members will be able to update their subscription preferences again. Do this after monthly reconciliation is complete." confirmLabel="Unlock Window" />
    </div>
  )
}
