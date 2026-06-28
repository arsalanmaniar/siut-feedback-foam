export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, patientName, fatherName, mrnNo, dateOfProcedure, contactNumber, language, answers, submittedAt, deviceId } = body

    const staffAssisted = Array.isArray(answers?.q57) && answers.q57.length > 0

    const response = await prisma.surveyResponse.upsert({
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
      // Finalize any in-progress draft row (same id) into a complete submission.
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

    return Response.json({ success: true, id: response.id })
  } catch (error) {
    console.error('Submit error:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
