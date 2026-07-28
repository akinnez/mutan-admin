import { format, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatDate = (date: string | Date) =>
  format(new Date(date), 'dd MMM yyyy')

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'dd MMM yyyy, hh:mm a')

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true })

export const formatPercent = (value: number) =>
  `${value.toFixed(1)}%`

export const statusColor = (status: string) => {
  const map: Record<string, string> = {
    active: 'badge-green',
    approved: 'badge-green',
    green: 'badge-green',
    published: 'badge-green',
    open: 'badge-green',
    pending: 'badge-yellow',
    yellow: 'badge-yellow',
    staging: 'badge-yellow',
    suspended: 'badge-gold',
    dormant: 'badge-gray',
    rejected: 'badge-red',
    red: 'badge-red',
    defaulted: 'badge-red',
    disposed: 'badge-red',
    discarded: 'badge-gray',
    exited: 'badge-gray',
    fully_paid: 'badge-green',
    matured: 'badge-gold',
    closed: 'badge-gray',
    pending_confirmation: 'badge-yellow',
    pending_approval: 'badge-yellow',
    posted: 'badge-green',
  }
  return map[status] ?? 'badge-gray'
}

export const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    member: 'Member',
    secretary: 'Secretary',
    financial_secretary: 'Financial Secretary',
    board_director: 'Board Director',
    chairman: 'Chairman',
  }
  return map[role] ?? role
}

export const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'member', label: 'Member' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'financial_secretary', label: 'Financial Secretary' },
  { value: 'board_director', label: 'Board Director' },
  { value: 'chairman', label: 'Chairman' },
]

export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ')


export function formatToNigeriaInternational(phoneNumber: string | number): string {
  // Convert to string and strip out any spaces, hyphens, or non-digit characters
  let cleaned = String(phoneNumber).trim().replace(/\D/g, '');

  // If already prefixed with 234, ensure it's left intact
  if (cleaned.startsWith('234')) {
    return cleaned;
  }

  // If it starts with a local leading '0', strip it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Prepend country code
  return `234${cleaned}`;
}