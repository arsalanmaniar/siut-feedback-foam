'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface StaffInfo {
  name: string | null
  email: string
}

interface NavItem {
  href: string
  label: string
  exact: boolean
  newTab?: boolean
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: '/admin/responses',
    label: 'Responses',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: '/admin/comments',
    label: 'Comments',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/export',
    label: 'Export',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    href: '/survey',
    label: 'Survey',
    exact: false,
    newTab: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
        <line x1="12" y1="12" x2="15" y2="12" />
        <circle cx="9" cy="16" r="1" stroke="currentColor" />
        <line x1="12" y1="16" x2="15" y2="16" />
      </svg>
    ),
  },
]

function NavLinks({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = !item.newTab && (item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/'))
        const cls = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-red-600 text-white shadow-sm'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`
        if (item.newTab) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavClick}
              className={cls}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 opacity-40 shrink-0">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cls}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function StaffBadge() {
  const [staff, setStaff] = useState<StaffInfo | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token
      if (!token) return
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setStaff(await res.json())
    })
  }, [])

  if (!staff) return null

  return (
    <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
      <p className="text-white text-sm font-semibold truncate">{staff.name ?? 'Staff'}</p>
      <p className="text-gray-400 text-xs truncate mt-0.5">{staff.email}</p>
    </div>
  )
}

function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="p-3 border-t border-white/10">
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white w-full transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16,17 21,12 16,7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign Out
      </button>
    </div>
  )
}

function SidebarBody({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="bg-white rounded-xl p-3 flex items-center justify-center">
          <Image
            src="/siut-logo-official.png"
            alt="SIUT"
            width={120}
            height={44}
            className="object-contain"
          />
        </div>
        <p className="text-gray-500 text-xs text-center mt-2 font-medium tracking-wide uppercase">
          Admin Portal
        </p>
      </div>

      <NavLinks onNavClick={onNavClick} />

      <StaffBadge />
      <LogoutButton />

      <p className="text-gray-600 text-[11px] text-center py-3 px-4 border-t border-white/5">
        Developed by Arsalan Maniar
      </p>
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-gray-900 h-14 flex items-center px-4 gap-3 border-b border-white/10">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-400 hover:text-white p-1 rounded"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-white text-sm font-semibold">SIUT Admin</span>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slides in) */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarBody onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-64 bg-gray-900">
        <SidebarBody />
      </aside>
    </>
  )
}
