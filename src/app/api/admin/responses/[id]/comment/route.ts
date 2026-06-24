export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser, unauthorised } from '@/lib/admin-auth'

// PATCH /api/admin/responses/[id]/comment — update q55_text (and optional category override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser(request)
  if (!user) return unauthorised()

  const { id } = await params
  const { text, categoryOverride } = await request.json()

  const response = await prisma.surveyResponse.findUnique({
    where: { id },
    select: { answers: true },
  })
  if (!response) return Response.json({ error: 'Not found' }, { status: 404 })

  const answers = response.answers as Record<string, unknown>
  const updated = {
    ...answers,
    q55_text: text ?? '',
    ...(categoryOverride ? { q55_category: categoryOverride } : { q55_category: undefined }),
  }
  if (!categoryOverride) delete updated.q55_category

  await prisma.surveyResponse.update({
    where: { id },
    data: { answers: JSON.parse(JSON.stringify(updated)) },
  })
  return Response.json({ success: true })
}

// DELETE /api/admin/responses/[id]/comment — clear q55_text only (keeps the response)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser(request)
  if (!user) return unauthorised()

  const { id } = await params
  const response = await prisma.surveyResponse.findUnique({
    where: { id },
    select: { answers: true },
  })
  if (!response) return Response.json({ error: 'Not found' }, { status: 404 })

  const answers = response.answers as Record<string, unknown>
  const updated = { ...answers }
  delete updated['q55_text']
  delete updated['q55_category']

  await prisma.surveyResponse.update({
    where: { id },
    data: { answers: JSON.parse(JSON.stringify(updated)) },
  })
  return Response.json({ success: true })
}
