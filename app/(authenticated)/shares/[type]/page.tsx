'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sharesApi, ShareTypeParam } from '@/lib/api/shares'
import { membersApi } from '@/lib/api/members'
import { useAuthStore } from '@/lib/stores/auth.store'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { Modal } from '@/components/shared/Modal'
import { FormField, Input, Textarea } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { ArrowLeft, Settings, Plus, Minus, Gift, ChevronLeft } from 'lucide-react'

export default function ShareTypeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const type = (params.type as string) === 'cbt' ? 'cbt' : 'mutan'
  const isCbt = type === 'cbt'

  const canManageSettings = user?.role === 'chairman' || user?.role === 'board_director'
  const canPurchaseOrRedeem = user?.role === 'financial_secretary' || user?.role === 'chairman'
  const canDeclareDividend = user?.role === 'chairman' || user?.role === 'board_director'

  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})
  const [showPurchase, setShowPurchase] = useState(false)
  const [showDividend, setShowDividend] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)

  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [units, setUnits] = useState('')
  const [dividendPerUnit, setDividendPerUnit] = useState('')
  const [dividendNote, setDividendNote] = useState('')
  const [redeemUnits, setRedeemUnits] = useState('')
  const [redeemReason, setRedeemReason] = useState('')

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['share-settings', type],
    queryFn: () => sharesApi.getSettings(type as ShareTypeParam),
  })
  const settings = settingsData?.data?.data ?? settingsData?.data ?? {}

  const { data: registerData, isLoading: registerLoading } = useQuery({
    queryKey: ['shares-register', type],
    queryFn: () => sharesApi.getRegister(type as ShareTypeParam),
  })
  const register = registerData?.data?.data ?? registerData?.data ?? { members: [] }

  const { data: memberResults } = useQuery({
    queryKey: ['member-search-shares', memberSearch],
    queryFn: () => membersApi.list({ search: memberSearch, limit: 5 }),
    enabled: memberSearch.length > 2 && !selectedMember,
  })
  const memberOptions = memberResults?.data?.data?.data ?? memberResults?.data?.data ?? []

  useEffect(() => {
    if (settings && !settingsLoading) {
      setSettingsForm({
        face_value_per_unit: settings.face_value_per_unit?.toString() ?? '',
        min_units_per_member: settings.min_units_per_member?.toString() ?? '',
        max_units_per_member: settings.max_units_per_member?.toString() ?? '',
        max_percent_of_total: settings.max_percent_of_total?.toString() ?? '',
        allow_new_purchases: settings.allow_new_purchases ? 'true' : 'false',
        monthly_levy_amount: settings.monthly_levy_amount?.toString() ?? '',
      })
    }
  }, [settings, settingsLoading])

  const resetActionState = () => { setSelectedMember(null); setMemberSearch(''); setUnits(''); setRedeemUnits(''); setRedeemReason('') }

  const settingsMutation = useMutation({
    mutationFn: () => sharesApi.updateSettings(type as ShareTypeParam, {
      face_value_per_unit: !isCbt && settingsForm.face_value_per_unit ? parseFloat(settingsForm.face_value_per_unit) : undefined,
      min_units_per_member: !isCbt && settingsForm.min_units_per_member ? parseFloat(settingsForm.min_units_per_member) : undefined,
      max_units_per_member: settingsForm.max_units_per_member ? parseFloat(settingsForm.max_units_per_member) : undefined,
      max_percent_of_total: !isCbt && settingsForm.max_percent_of_total ? parseFloat(settingsForm.max_percent_of_total) : undefined,
      allow_new_purchases: settingsForm.allow_new_purchases === 'true',
      monthly_levy_amount: isCbt && settingsForm.monthly_levy_amount ? parseFloat(settingsForm.monthly_levy_amount) : undefined,
    }),
    onSuccess: () => {
      toast.success('Settings updated')
      qc.invalidateQueries({ queryKey: ['share-settings', type] })
      setShowSettings(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not update settings'),
  })

  const purchaseMutation = useMutation({
    mutationFn: () => sharesApi.purchase({ member_id: selectedMember.id, units: parseFloat(units) }),
    onSuccess: () => {
      toast.success('Purchase recorded')
      qc.invalidateQueries({ queryKey: ['shares-register', type] })
      setShowPurchase(false)
      resetActionState()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not record purchase'),
  })

  const dividendMutation = useMutation({
    mutationFn: () => sharesApi.declareDividend({ dividend_per_unit: parseFloat(dividendPerUnit), note: dividendNote || undefined }),
    onSuccess: (res: any) => {
      const d = res?.data?.data ?? res?.data
      toast.success(`Dividend paid — ₦${d?.total_distributed?.toLocaleString?.() ?? ''} to ${d?.shareholders_paid ?? ''} member(s)`)
      qc.invalidateQueries({ queryKey: ['shares-register', type] })
      setShowDividend(false)
      setDividendPerUnit('')
      setDividendNote('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not declare dividend'),
  })

  const redeemMutation = useMutation({
    mutationFn: () => sharesApi.redeem(type as ShareTypeParam, {
      member_id: selectedMember.id, units_to_redeem: parseFloat(redeemUnits), reason: redeemReason || undefined,
    }),
    onSuccess: () => {
      toast.success('Shares redeemed')
      qc.invalidateQueries({ queryKey: ['shares-register', type] })
      setShowRedeem(false)
      resetActionState()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not redeem shares'),
  })

  return (
    <div>
      <TopBar title={isCbt ? 'CBT Shares' : 'MUTAN Shares'} subtitle={isCbt ? 'Levy-funded, halts at cap' : 'Admin-recorded purchases'} />
      <div className="p-6 space-y-6">
        <button onClick={() => router.push('/shares')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
          <ChevronLeft size={14} /> Back to Shares
        </button>

        <PageHeader
          title={isCbt ? 'CBT Shares' : 'MUTAN Shares'}
          subtitle={isCbt
            ? `₦${settings.monthly_levy_amount?.toLocaleString?.() ?? '—'} deducted monthly via levy${settings.cap ? ` · halts at ₦${settings.cap.toLocaleString()} per member` : ' · no cap set'}`
            : `₦${settings.face_value_per_unit?.toLocaleString?.() ?? '—'} per unit · max ${settings.max_percent_of_total ?? 20}% of total per member`}
          action={(
            <div className="flex gap-2">
              {canManageSettings && (
                <button onClick={() => setShowSettings(true)} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                  <Settings size={14} /> Settings
                </button>
              )}
              {canPurchaseOrRedeem && !isCbt && (
                <button onClick={() => setShowPurchase(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5">
                  <Plus size={14} /> Record Purchase
                </button>
              )}
              {canDeclareDividend && !isCbt && (
                <button onClick={() => setShowDividend(true)} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                  <Gift size={14} /> Declare Dividend
                </button>
              )}
              {canPurchaseOrRedeem && (
                <button onClick={() => setShowRedeem(true)} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                  <Minus size={14} /> Redeem
                </button>
              )}
            </div>
          )}
        />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Shareholders', value: register.members?.length ?? 0 },
            { label: isCbt ? 'Total CBT Value' : 'Total Units Issued', value: isCbt ? formatCurrency(register.total_units_issued ?? 0) : (register.total_units_issued ?? 0) },
            { label: isCbt ? 'Levy Status' : 'Purchases', value: isCbt ? (settings.allow_new_purchases ? 'Active' : 'Halted') : (settings.allow_new_purchases ? 'Open' : 'Closed') },
            { label: isCbt ? 'Per-Member Cap' : 'Legal Cap', value: isCbt ? (settings.cap ? formatCurrency(settings.cap) : 'Not set') : `${settings.max_percent_of_total ?? 20}%` },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-lg font-bold mb-1" style={{ color: 'var(--forest)' }}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Register table */}
        <div className="card overflow-hidden">
          {registerLoading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading…</p>
          ) : !register.members?.length ? (
            <EmptyState icon={Settings} title="No shareholders yet" description={isCbt ? 'Members will appear here once the monthly levy starts collecting.' : 'Record a purchase to get started.'} />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                      {['Member', isCbt ? 'CBT Value' : 'Units Held', isCbt ? '% of Cap' : '% of Total', isCbt ? '' : 'Value'].filter(Boolean).map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--forest)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {register.members.map((m: any) => (
                      <tr key={m.member_id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{m.full_name}</p>
                          <p className="text-xs text-gray-400">{m.mutan_id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">{isCbt ? formatCurrency(m.total_value) : m.units_held}</td>
                        <td className="px-4 py-3 text-xs">
                          {isCbt ? (
                            m.percent_of_cap !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${m.percent_of_cap}%`, background: Number(m.percent_of_cap) >= 100 ? '#16a34a' : 'var(--forest)' }} />
                                </div>
                                <span className="text-gray-500">{m.percent_of_cap}%</span>
                              </div>
                            ) : <span className="text-gray-300">no cap</span>
                          ) : `${m.percent_of_total}%`}
                        </td>
                        {!isCbt && <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(m.total_value)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-3">
                {register.members.map((m: any) => (
                  <MobileCard key={m.member_id}>
                    <MobileCardHeader title={m.full_name} subtitle={m.mutan_id} />
                    <MobileRow label={isCbt ? 'CBT Value' : 'Units Held'} value={isCbt ? formatCurrency(m.total_value) : m.units_held} />
                    {!isCbt && <MobileRow label="Value" value={formatCurrency(m.total_value)} />}
                    <MobileRow label={isCbt ? '% of Cap' : '% of Total'} value={isCbt ? (m.percent_of_cap !== null ? `${m.percent_of_cap}%` : 'no cap') : `${m.percent_of_total}%`} />
                  </MobileCard>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title={`${isCbt ? 'CBT' : 'MUTAN'} Shares Settings`} size="md">
        <div className="space-y-4">
          {isCbt ? (
            <>
              <FormField label="Monthly Levy Amount (₦)" required hint="Flat amount deducted from every member each month via the levy pipeline.">
                <Input type="number" value={settingsForm.monthly_levy_amount ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, monthly_levy_amount: e.target.value }))} />
              </FormField>
              <FormField label="Per-Member Cap (₦)" hint="The levy halts for a member once their CBT total reaches this — leave blank for no cap.">
                <Input type="number" value={settingsForm.max_units_per_member ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, max_units_per_member: e.target.value }))} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Face Value per Unit (₦)" required>
                <Input type="number" value={settingsForm.face_value_per_unit ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, face_value_per_unit: e.target.value }))} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Units per Member">
                  <Input type="number" value={settingsForm.min_units_per_member ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, min_units_per_member: e.target.value }))} />
                </FormField>
                <FormField label="Max Units per Member">
                  <Input type="number" value={settingsForm.max_units_per_member ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, max_units_per_member: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Max % of Total (Legal Cap)" hint="Nigerian cooperative law ceiling — 20% maximum.">
                <Input type="number" value={settingsForm.max_percent_of_total ?? ''} onChange={(e) => setSettingsForm((f) => ({ ...f, max_percent_of_total: e.target.value }))} />
              </FormField>
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settingsForm.allow_new_purchases === 'true'}
              onChange={(e) => setSettingsForm((f) => ({ ...f, allow_new_purchases: e.target.checked ? 'true' : 'false' }))} />
            {isCbt ? 'Levy is currently active' : 'Allow new purchases'}
          </label>
          <button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} className="btn-primary w-full">
            {settingsMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </Modal>

      {/* Purchase Modal (MUTAN only) */}
      <Modal open={showPurchase} onClose={() => { setShowPurchase(false); resetActionState() }} title="Record MUTAN Share Purchase" size="md">
        <MemberPicker selectedMember={selectedMember} setSelectedMember={setSelectedMember} memberSearch={memberSearch} setMemberSearch={setMemberSearch} memberOptions={memberOptions} />
        {selectedMember && (
          <div className="space-y-4 mt-4">
            <FormField label="Units to Purchase" required>
              <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
            </FormField>
            {units && settings.face_value_per_unit && (
              <p className="text-xs text-gray-500">Total: <strong>{formatCurrency(parseFloat(units) * settings.face_value_per_unit)}</strong></p>
            )}
            <button onClick={() => purchaseMutation.mutate()} disabled={!units || purchaseMutation.isPending} className="btn-primary w-full">
              {purchaseMutation.isPending ? 'Recording…' : 'Record Purchase'}
            </button>
          </div>
        )}
      </Modal>

      {/* Dividend Modal (MUTAN only) */}
      <Modal open={showDividend} onClose={() => setShowDividend(false)} title="Declare Annual Dividend" size="md">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Pays every MUTAN shareholder proportional to units held, credited to their compulsory savings wallet.</p>
          <FormField label="Dividend per Unit (₦)" required>
            <Input type="number" value={dividendPerUnit} onChange={(e) => setDividendPerUnit(e.target.value)} />
          </FormField>
          <FormField label="Note (optional)">
            <Textarea value={dividendNote} onChange={(e) => setDividendNote(e.target.value)} placeholder="e.g. FY2025 AGM-approved dividend" />
          </FormField>
          <button onClick={() => dividendMutation.mutate()} disabled={!dividendPerUnit || dividendMutation.isPending} className="btn-primary w-full">
            {dividendMutation.isPending ? 'Distributing…' : 'Declare & Distribute'}
          </button>
        </div>
      </Modal>

      {/* Redeem Modal (both types) */}
      <Modal open={showRedeem} onClose={() => { setShowRedeem(false); resetActionState() }} title={`Redeem ${isCbt ? 'CBT' : 'MUTAN'} Shares`} size="md">
        <MemberPicker selectedMember={selectedMember} setSelectedMember={setSelectedMember} memberSearch={memberSearch} setMemberSearch={setMemberSearch} memberOptions={memberOptions} />
        {selectedMember && (
          <div className="space-y-4 mt-4">
            <FormField label={isCbt ? 'Amount to Redeem (₦)' : 'Units to Redeem'} required>
              <Input type="number" value={redeemUnits} onChange={(e) => setRedeemUnits(e.target.value)} />
            </FormField>
            <FormField label="Reason (optional)">
              <Textarea value={redeemReason} onChange={(e) => setRedeemReason(e.target.value)} placeholder="e.g. Member exiting the cooperative" />
            </FormField>
            <button onClick={() => redeemMutation.mutate()} disabled={!redeemUnits || redeemMutation.isPending} className="btn-danger w-full">
              {redeemMutation.isPending ? 'Redeeming…' : 'Redeem'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MemberPicker({ selectedMember, setSelectedMember, memberSearch, setMemberSearch, memberOptions }: any) {
  return selectedMember ? (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border" style={{ borderColor: 'var(--forest)', background: 'var(--forest-light)' }}>
      <div>
        <p className="text-sm font-medium">{selectedMember.full_name}</p>
        <p className="text-xs text-gray-500">{selectedMember.mutan_id}</p>
      </div>
      <button type="button" onClick={() => setSelectedMember(null)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
    </div>
  ) : (
    <FormField label="Member" required>
      <div className="relative">
        <Input value={memberSearch} onChange={(e: any) => setMemberSearch(e.target.value)} placeholder="Search by name or MUTAN ID…" />
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
    </FormField>
  )
}
