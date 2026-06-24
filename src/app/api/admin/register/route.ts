export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json() as {
    email: string
    password: string
    name: string
  }

  if (!email || !password || !name) {
    return Response.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } })
  if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const hasServiceKey = serviceKey && serviceKey !== 'your-supabase-service-role-key'

  let needsEmailConfirmation = false

  if (hasServiceKey) {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return Response.json({ error: error.message }, { status: 400 })
  } else {
    const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data, error } = await anon.auth.signUp({ email, password })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    needsEmailConfirmation = !data.user?.identities?.length
  }

  await prisma.adminUser.create({ data: { email, name, role: 'admin' } })

  return Response.json({ success: true, needsEmailConfirmation })
}
