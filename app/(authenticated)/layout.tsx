import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col w-full md:ml-[var(--sidebar-width)]">
        {children}
      </main>
    </div>
  )
}
