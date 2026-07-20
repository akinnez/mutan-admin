import { statusColor } from '@/lib/utils/format'

interface Props {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: Props) {
  const cls = statusColor(status)
  const text = label ?? status.replace(/_/g, ' ')
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {text}
    </span>
  )
}
