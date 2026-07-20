'use client'

// Stacked-card view shown in place of a <table> below the md breakpoint.
// Pair with a `hidden md:block` wrapper around the actual <table>, and put
// this in a `md:hidden` wrapper.
export function MobileCard({
  children, className = '', style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card p-4 ${className}`} style={style}>{children}</div>
}

// One label/value line inside a MobileCard — the mobile equivalent of a
// table cell, paired with its column header as the label.
export function MobileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-right" style={{ color: 'var(--charcoal)' }}>{value}</span>
    </div>
  )
}

// Header row inside a card — the "primary" identifying info for that row
// (e.g. member name + MUTAN ID), with an optional badge/value on the right.
export function MobileCardHeader({
  title, subtitle, right,
}: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
