'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadsApi } from '@/lib/api/uploads'
import { TopBar } from '@/components/layout/TopBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileCard, MobileCardHeader, MobileRow } from '@/components/shared/MobileCard'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import { Upload, Eye, CheckCircle, Trash2, AlertTriangle, Pencil } from 'lucide-react'
import type { UploadBatch, UploadRow } from '@/lib/types'

export default function UploadsPage() {
  const qc = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [monthLabel, setMonthLabel] = useState('')
  const [viewing, setViewing] = useState<UploadBatch | null>(null)
  const [publishTarget, setPublishTarget] = useState<UploadBatch | null>(null)
  const [discardTarget, setDiscardTarget] = useState<UploadBatch | null>(null)
  const [editingRow, setEditingRow] = useState<UploadRow | null>(null)
  const [editValues, setEditValues] = useState({ raw_staff_id: '', raw_mutan_id: '', amount_paid: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => uploadsApi.list(),
  })
  const batches: UploadBatch[] = data?.data?.data ?? data?.data ?? []

  const { data: batchDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['batch-detail', viewing?.id],
    queryFn: () => uploadsApi.getBatch(viewing!.id),
    enabled: !!viewing,
  })
  const detail = batchDetail?.data?.data ?? batchDetail?.data
  const rows: UploadRow[] = detail?.rows ?? []

  const uploadMutation = useMutation({
    mutationFn: ({ file, month_label }: { file: File; month_label: string }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('month_label', month_label)
      return uploadsApi.upload(fd)
    },
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data
      toast.success(`Staged: ${r.green_rows} green, ${r.yellow_rows} yellow, ${r.red_rows} red`)
      qc.invalidateQueries({ queryKey: ['uploads'] })
      setShowUpload(false)
      setFile(null)
      setMonthLabel('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => uploadsApi.publish(id),
    onSuccess: () => {
      toast.success('Batch published — wallets updated')
      qc.invalidateQueries({ queryKey: ['uploads'] })
      setPublishTarget(null)
      setViewing(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Publish failed'),
  })

  const discardMutation = useMutation({
    mutationFn: (id: string) => uploadsApi.discard(id),
    onSuccess: () => {
      toast.success('Batch discarded')
      qc.invalidateQueries({ queryKey: ['uploads'] })
      setDiscardTarget(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Discard failed'),
  })

  const correctMutation = useMutation({
    mutationFn: ({ rowId, data }: { rowId: string; data: any }) =>
      uploadsApi.correctRow(viewing!.id, rowId, data),
    onSuccess: () => {
      toast.success('Row corrected')
      qc.invalidateQueries({ queryKey: ['batch-detail', viewing?.id] })
      qc.invalidateQueries({ queryKey: ['uploads'] })
      setEditingRow(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Correction failed'),
  })

  const rowBg = (status: string) => ({
    green: '#f0fdf4', yellow: '#fefce8', red: '#fef2f2',
  }[status] ?? '#fff')

  return (
    <div>
      <TopBar title="Uploads" subtitle="Monthly deduction reconciliation" />
      <div className="p-6">
        <PageHeader
          title="Upload Batches"
          subtitle="Upload monthly payroll deduction spreadsheets"
          action={
            <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
              <Upload size={14} /> Upload Sheet
            </button>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        ) : batches.length === 0 ? (
          <div className="card">
            <EmptyState icon={Upload} title="No batches uploaded yet" description="Upload the monthly payroll deduction spreadsheet to get started." />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--forest-light)', borderBottom: '1px solid var(--border)' }}>
                    {['Month', 'File', 'Rows', 'Green', 'Yellow', 'Red', 'Status', 'Uploaded', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => (
                    <tr key={batch.id} className="table-row-hover border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{batch.month_label}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px]">{batch.filename}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{batch.total_rows}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="badge-green px-2 py-0.5 rounded-full text-xs">{batch.green_rows}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="badge-yellow px-2 py-0.5 rounded-full text-xs">{batch.yellow_rows}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="badge-red px-2 py-0.5 rounded-full text-xs">{batch.red_rows}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={batch.status} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(batch.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setViewing(batch)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Eye size={13} /></button>
                          {batch.status === 'staging' && (
                            <>
                              <button onClick={() => setPublishTarget(batch)} disabled={batch.red_rows > 0}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-700 disabled:opacity-30">
                                <CheckCircle size={13} />
                              </button>
                              <button onClick={() => setDiscardTarget(batch)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {batches.map(batch => (
                <MobileCard key={batch.id}>
                  <MobileCardHeader
                    title={batch.month_label}
                    subtitle={batch.filename}
                    right={<StatusBadge status={batch.status} />}
                  />
                  <MobileRow label="Total Rows" value={batch.total_rows} />
                  <MobileRow label="Green / Yellow / Red" value={
                    <span className="flex gap-1">
                      <span className="badge-green px-2 py-0.5 rounded-full text-xs">{batch.green_rows}</span>
                      <span className="badge-yellow px-2 py-0.5 rounded-full text-xs">{batch.yellow_rows}</span>
                      <span className="badge-red px-2 py-0.5 rounded-full text-xs">{batch.red_rows}</span>
                    </span>
                  } />
                  <MobileRow label="Uploaded" value={formatDate(batch.created_at)} />
                  <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => setViewing(batch)} className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2">
                      <Eye size={13} /> View Rows
                    </button>
                    {batch.status === 'staging' && (
                      <>
                        <button onClick={() => setPublishTarget(batch)} disabled={batch.red_rows > 0}
                          className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-30" style={{ color: 'var(--forest)' }}>
                          <CheckCircle size={13} /> Publish
                        </button>
                        <button onClick={() => setDiscardTarget(batch)} className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2" style={{ color: '#991b1b' }}>
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => { setShowUpload(false); setFile(null); setMonthLabel('') }} title="Upload Deduction Sheet">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Month Label <span className="text-red-500">*</span></label>
            <input value={monthLabel} onChange={e => setMonthLabel(e.target.value)}
              placeholder="e.g. January 2026"
              className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
            <p className="text-xs text-gray-400 mt-1">This labels the batch — use the month the deductions represent, not today's date.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Spreadsheet File <span className="text-red-500">*</span></label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
              style={{ borderColor: file ? 'var(--forest)' : '#e2e8f0' }}
              onClick={() => document.getElementById('batch-file')?.click()}
            >
              <Upload size={22} className="mx-auto mb-2" style={{ color: file ? 'var(--forest)' : '#cbd5e1' }} />
              <p className="text-sm" style={{ color: file ? 'var(--forest)' : '#94a3b8' }}>
                {file ? file.name : 'Click to select .xlsx file'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Columns: STAFF_ID, MUTAN_ID, AMOUNT_PAID</p>
              <input id="batch-file" type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowUpload(false); setFile(null); setMonthLabel('') }} className="btn-secondary">Cancel</button>
            <button disabled={!file || !monthLabel || uploadMutation.isPending}
              onClick={() => file && monthLabel && uploadMutation.mutate({ file, month_label: monthLabel })}
              className="btn-primary">
              {uploadMutation.isPending ? 'Uploading…' : 'Upload & Stage'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Detail Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Batch: ${viewing?.month_label}`} size="xl">
        {detailLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: 'var(--forest)' }} /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Rows', value: detail?.batch?.total_rows, cls: 'badge-gray' },
                { label: 'Green', value: detail?.batch?.green_rows, cls: 'badge-green' },
                { label: 'Yellow', value: detail?.batch?.yellow_rows, cls: 'badge-yellow' },
                { label: 'Red (must fix)', value: detail?.batch?.red_rows, cls: 'badge-red' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="card p-3 text-center">
                  <p className={`text-2xl font-bold mb-1 ${cls} inline-block px-2 rounded-lg`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {detail?.batch?.red_rows > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: '#fef2f2', color: '#991b1b' }}>
                <AlertTriangle size={14} />
                <span>Fix all red rows before publishing. Click the edit icon on any red row to correct it.</span>
              </div>
            )}
            {/* Desktop table */}
            <div className="hidden md:block overflow-auto max-h-[400px] rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: 'var(--forest-light)' }}>
                  <tr>
                    {['Staff ID', 'MUTAN ID', 'Amount', 'Matched Member', 'Status', 'Note', 'Fix'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ background: rowBg(row.status), borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.raw_staff_id}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.raw_mutan_id}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{formatCurrency(row.amount_paid)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.resolved_member ? `${row.resolved_member.full_name} (${row.resolved_member.mutan_id})` : <span className="text-red-500">Unresolved</span>}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{row.variance_note ?? '—'}</td>
                      <td className="px-3 py-2">
                        {viewing?.status === 'staging' && (
                          <button onClick={() => { setEditingRow(row); setEditValues({ raw_staff_id: row.raw_staff_id, raw_mutan_id: row.raw_mutan_id, amount_paid: String(row.amount_paid) }) }}
                            className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-700">
                            <Pencil size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {rows.map(row => (
                <MobileCard key={row.id} style={{ background: rowBg(row.status) }}>
                  <MobileCardHeader
                    title={row.resolved_member ? row.resolved_member.full_name : <span className="text-red-500">Unresolved</span>}
                    subtitle={row.resolved_member ? row.resolved_member.mutan_id : `Staff: ${row.raw_staff_id}`}
                    right={
                      <div className="flex items-center gap-1">
                        <StatusBadge status={row.status} />
                        {viewing?.status === 'staging' && (
                          <button onClick={() => { setEditingRow(row); setEditValues({ raw_staff_id: row.raw_staff_id, raw_mutan_id: row.raw_mutan_id, amount_paid: String(row.amount_paid) }) }}
                            className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-700">
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    }
                  />
                  <MobileRow label="Staff ID" value={<span className="font-mono">{row.raw_staff_id}</span>} />
                  <MobileRow label="MUTAN ID" value={<span className="font-mono">{row.raw_mutan_id}</span>} />
                  <MobileRow label="Amount" value={<span className="font-semibold">{formatCurrency(row.amount_paid)}</span>} />
                  {row.variance_note && <p className="text-xs text-gray-500 mt-1">{row.variance_note}</p>}
                </MobileCard>
              ))}
            </div>
            {viewing?.status === 'staging' && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDiscardTarget(viewing)} className="btn-danger flex items-center gap-2"><Trash2 size={13} /> Discard</button>
                <button
                  disabled={detail?.batch?.red_rows > 0 || publishMutation.isPending}
                  onClick={() => setPublishTarget(viewing)}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle size={13} />
                  {publishMutation.isPending ? 'Publishing…' : 'Publish Batch'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Row Modal */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title="Correct Row" size="sm">
        <div className="space-y-3">
          {[
            { label: 'Staff ID', key: 'raw_staff_id' },
            { label: 'MUTAN ID', key: 'raw_mutan_id' },
            { label: 'Amount Paid', key: 'amount_paid' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1">{label}</label>
              <input value={(editValues as any)[key]}
                onChange={e => setEditValues(v => ({ ...v, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditingRow(null)} className="btn-secondary">Cancel</button>
            <button disabled={correctMutation.isPending}
              onClick={() => editingRow && correctMutation.mutate({
                rowId: editingRow.id,
                data: { ...editValues, amount_paid: parseFloat(editValues.amount_paid) },
              })}
              className="btn-primary"
            >
              {correctMutation.isPending ? 'Saving…' : 'Save Correction'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!publishTarget} onClose={() => setPublishTarget(null)}
        onConfirm={() => publishTarget && publishMutation.mutate(publishTarget.id)}
        loading={publishMutation.isPending} title="Publish Batch"
        message={`This will permanently post ${publishTarget?.total_rows} records to member wallets for ${publishTarget?.month_label}. This cannot be undone.`}
        confirmLabel="Publish" />
      <ConfirmDialog open={!!discardTarget} onClose={() => setDiscardTarget(null)}
        onConfirm={() => discardTarget && discardMutation.mutate(discardTarget.id)}
        loading={discardMutation.isPending} title="Discard Batch"
        message="This will permanently delete this unpublished batch. The spreadsheet will need to be re-uploaded."
        confirmLabel="Discard" variant="danger" />
    </div>
  )
}
