'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Users,
  LogOut,
  HelpCircle,
  Upload,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Categories', icon: BookOpen },
  { href: '/admin/quizzes',    label: 'Quizzes',    icon: ListChecks },
  { href: '/admin/questions',  label: 'Questions',  icon: HelpCircle },
  { href: '/admin/students',   label: 'Students',   icon: Users },
  { href: '/admin/import',     label: 'Import Quiz',icon: Upload },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-primary flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shadow-inner">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">Genius Grid</p>
            <p className="text-[11px] text-white/50 font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                active
                  ? 'bg-white text-primary shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-primary' : 'text-white/70 group-hover:text-white'}`} />
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all w-full"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
