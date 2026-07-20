'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth.store'

const schema = z.object({
  phone_number: z.string().min(10, 'Enter your phone number'),
  password: z.string().min(6, 'Enter your password'),
})

type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: LoginForm) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(values)
      const payload = data.data ?? data

      // Only allow admin roles
      const adminRoles = ['secretary', 'financial_secretary', 'board_director', 'chairman']
      if (!adminRoles.includes(payload.member.role)) {
        toast.error('Access denied. This portal is for administrators only.')
        return
      }

      setAuth(payload.member)
      toast.success(`Welcome back, ${payload.member.full_name.split(' ')[0]}`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface)' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] p-12"
        style={{ background: 'var(--forest)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gold)' }}
            >
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">MUTAN Cooperative</p>
              <p className="text-white/50 text-xs">Admin Portal</p>
            </div>
          </div>

          <h1 className="text-white text-4xl leading-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Manage with<br />
            <span style={{ color: 'var(--gold)' }}>Confidence</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            A transparent, Shariah-compliant cooperative management system for Muslim teachers across Nigeria.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Members', desc: 'Manage 400+ teachers' },
            { label: 'Waterfall Allocation', desc: 'Auto-distributes deductions' },
            { label: 'Full Audit Trail', desc: 'Every action logged' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
              <div>
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-white/50 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} MUTAN Cooperative Society
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--forest)' }}
            >
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--forest)' }}>MUTAN Cooperative</p>
              <p className="text-gray-400 text-xs">Admin Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--charcoal)' }}>
            Sign in
          </h2>
          <p className="text-gray-400 text-sm mb-8">Enter your registered phone number and password</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--charcoal)' }}>
                Phone Number
              </label>
              <input
                {...register('phone_number')}
                type="tel"
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-xl border text-sm"
                style={{ borderColor: errors.phone_number ? '#991b1b' : '#e2e8f0' }}
              />
              {errors.phone_number && (
                <p className="text-red-600 text-xs mt-1">{errors.phone_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--charcoal)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  className="w-full px-4 py-3 rounded-xl border text-sm pr-12"
                  style={{ borderColor: errors.password ? '#991b1b' : '#e2e8f0' }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            This portal is restricted to authorised MUTAN administrators only.
          </p>
        </div>
      </div>
    </div>
  )
}
