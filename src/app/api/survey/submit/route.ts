export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, patientName, fatherName, mrnNo, dateOfProcedure, contactNumber, language, answers, submittedAt, deviceId } = body

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
        submittedAt: new Date(submittedAt),
        syncedAt: new Date(),
        deviceId,
        staffAssisted: Array.isArray(answers?.q57) && answers.q57.length > 0,
      },
      update: {
        syncedAt: new Date(),
      },
    })

    return Response.json({ success: true, id: response.id })
  } catch (error) {
    console.error('Submit error:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
