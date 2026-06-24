'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INP    = 'w-full p-3 border-2 rounded-lg text-sm bg-white transition-shadow duration-150'
const BLUR_S  = { outline: 'none', borderColor: '#d1d5db' }
const FOCUS_S = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

function Field({
  type,
  value,
  onChange,
  placeholder,
}: {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required
      className={INP}
      style={focused ? FOCUS_S : BLUR_S}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

export default function LoginPage() {
  const router  = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/siut-logo-official.png" alt="SIUT" width={160} height={64} className="object-contain mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>
          <p className="text-gray-500 text-sm">Survey Management Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Field type="email" value={email} onChange={setEmail} placeholder="you@siut.edu.pk" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Field type="password" value={password} onChange={setPassword} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 text-white font-bold py-3 rounded-lg hover:bg-red-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            New staff member?{' '}
            <Link href="/admin/register" className="text-red-700 font-medium hover:underline">Create Account</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Developed by Arsalan Maniar</p>
      </div>
    </div>
  )
}
