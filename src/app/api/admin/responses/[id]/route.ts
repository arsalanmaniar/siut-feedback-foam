export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser, unauthorised } from '@/lib/admin-auth'

// DELETE /api/admin/responses/[id] — remove entire response
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser(request)
  if (!user) return unauthorised()

  const { id } = await params
  try {
    await prisma.surveyResponse.delete({ where: { id } })
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Not found or already deleted' }, { status: 404 })
  }
}

// PUT /api/admin/responses/[id] — update patient info + answers
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser(request)
  if (!user) return unauthorised()

  const { id } = await params
  const body = await request.json()

  const {
    patientName,
    fatherName,
    mrnNo,
    dateOfProcedure,
    contactNumber,
    language,
    answers,
  } = body

  try {
    const updated = await prisma.surveyResponse.update({
      where: { id },
      data: {
        patientName,
        fatherName,
        mrnNo,
        dateOfProcedure: new Date(dateOfProcedure),
        contactNumber,
        language,
        answers,
      },
    })
    return Response.json({ success: true, id: updated.id })
  } catch {
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }
}
