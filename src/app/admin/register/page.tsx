'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INP    = 'w-full p-3 border-2 rounded-lg text-sm bg-white transition-shadow duration-150'
const BLUR_S  = { outline: 'none', borderColor: '#d1d5db' }
const FOCUS_S = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/admin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Registration failed.')
      setLoading(false)
      return
    }

    if (data.needsEmailConfirmation) {
      setInfo('Account created! Check your email to confirm your address, then log in.')
      setLoading(false)
      return
    }

    // Auto sign-in and go straight to dashboard
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setInfo('Account created! Please log in with your new credentials.')
      setLoading(false)
      router.push('/admin/login')
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/siut-logo-official.png" alt="SIUT" width={140} height={56} className="object-contain mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm text-center">Register your staff account for the admin portal</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Full Name"        type="text"     value={name}     onChange={setName}     placeholder="Your full name" />
          <Field label="Email"            type="email"    value={email}    onChange={setEmail}    placeholder="you@siut.edu.pk" />
          <Field label="Password"         type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
          <Field label="Confirm Password" type="password" value={confirm}  onChange={setConfirm} />

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {info  && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 text-white font-bold py-3 rounded-lg hover:bg-red-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/admin/login" className="text-red-700 font-medium hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-3">Developed by Arsalan Maniar</p>
      </div>
    </div>
  )
}
