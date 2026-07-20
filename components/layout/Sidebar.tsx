'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, CreditCard, TrendingUp,
  PieChart, Building2, Receipt, Upload, BarChart3,
  Settings, LogOut, Shield, ChevronRight, Bell, Landmark, Activity, X, ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth.store'
import { useUIStore } from '@/lib/stores/ui.store'
import { authApi } from '@/lib/api/auth'
import toast from 'react-hot-toast'
import { roleLabel } from '@/lib/utils/format'

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Uploads', href: '/uploads', icon: Upload },
  { label: 'Payments', href: '/payments', icon: Receipt },
  { label: 'Adjustments', href: '/adjustments', icon: SlidersHorizontal },
  { label: 'Schemes', href: '/schemes', icon: BookOpen },
  { label: 'Loans', href: '/loans', icon: CreditCard },
  { label: 'Investments', href: '/investments', icon: TrendingUp },
  { label: 'Shares', href: '/shares', icon: PieChart },
  { label: 'Assets', href: '/assets', icon: Building2 },
  { label: 'Levies', href: '/levies', icon: Receipt },
  { label: 'Ledger', href: '/ledger', icon: Landmark },
  { label: 'Reconciliation', href: '/reconciliation', icon: ShieldCheck },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const isMobileNavOpen = useUIStore((s) => s.isMobileNavOpen)
  const closeMobileNav = useUIStore((s) => s.closeMobileNav)

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    router.push('/login')
    toast.success('Logged out')
  }

  return (
    <>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeMobileNav}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-transform duration-200 md:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 'var(--sidebar-width)', background: '#fff', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--forest)' }}
            >
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--forest)', fontFamily: 'var(--font-display)' }}>
                MUTAN
              </p>
              <p className="text-gray-400 text-xs">Cooperative Admin</p>
            </div>
          </div>
          <button onClick={closeMobileNav} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobileNav}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all group ${
                  active ? 'nav-link-active' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={16} className={active ? 'text-forest-900' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={12} style={{ color: 'var(--forest)' }} />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--gold)' }}
            >
              {user?.full_name?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--charcoal)' }}>
                {user?.full_name}
              </p>
              <p className="text-xs text-gray-400 truncate">{roleLabel(user?.role ?? '')}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

