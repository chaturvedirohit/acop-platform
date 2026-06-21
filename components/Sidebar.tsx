'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  Bot,
  ShieldCheck,
  BookOpen,
  LogOut,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Ticket Queue', icon: Ticket },
  { href: '/agents', label: 'Agent Monitor', icon: Bot },
  { href: '/review', label: 'Human Review', icon: ShieldCheck },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-white flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-700 flex items-center gap-2">
        <div className="bg-indigo-500 rounded-lg p-1.5">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">ACOP</p>
          <p className="text-xs text-slate-400 leading-tight">AI Ops Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
