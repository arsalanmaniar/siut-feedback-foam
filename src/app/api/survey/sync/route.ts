export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, patientName, fatherName, mrnNo, dateOfProcedure, contactNumber, language, answers, submittedAt, deviceId } = body

    const staffAssisted = Array.isArray(answers?.q57) && answers.q57.length > 0

    await prisma.surveyResponse.upsert({
      where: { id },
      create: {
        id,
        patientName,
        fatherName,
        mrnNo,
        dateOfProcedure: new Date(dateOfProcedure),
        contactNumber,
        language,
        answers,
        status: 'complete',
        submittedAt: new Date(submittedAt),
        syncedAt: new Date(),
        deviceId,
        staffAssisted,
      },
      // Finalize: an in-progress draft row (same id) is promoted to a complete
      // submission, with the latest patient info and answers written through.
      update: {
        patientName,
        fatherName,
        mrnNo,
        dateOfProcedure: new Date(dateOfProcedure),
        contactNumber,
        language,
        answers,
        status: 'complete',
        submittedAt: new Date(submittedAt),
        syncedAt: new Date(),
        staffAssisted,
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
