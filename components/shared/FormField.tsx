interface Props {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}

export function FormField({ label, error, required, children, hint }: Props) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--charcoal)' }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white ${className}`}
      style={{ borderColor: '#e2e8f0', ...props.style }}
    />
  )
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white ${className}`}
      style={{ borderColor: '#e2e8f0', ...props.style }}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white resize-none ${className}`}
      style={{ borderColor: '#e2e8f0', ...props.style }}
    />
  )
}
