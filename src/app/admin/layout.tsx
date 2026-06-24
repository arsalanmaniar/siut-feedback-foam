'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && pathname !== '/admin/login' && pathname !== '/admin/register') {
        router.push('/admin/login')
      }
      setChecking(false)
    })
  }, [pathname, router])

  if (pathname === '/admin/login' || pathname === '/admin/register') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* Offset main content by sidebar width on desktop; add top padding on mobile for the top bar */}
      <div className="flex-1 md:ml-64 pt-14 md:pt-0">
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
