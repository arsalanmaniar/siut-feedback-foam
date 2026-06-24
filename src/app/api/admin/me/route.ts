export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth  = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.email) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const adminUser = await prisma.adminUser.findUnique({
    where: { email: user.email },
    select: { name: true, email: true, role: true },
  })

  // Fall back to the Supabase email if no AdminUser row exists yet
  return Response.json(adminUser ?? { name: null, email: user.email, role: null })
}
