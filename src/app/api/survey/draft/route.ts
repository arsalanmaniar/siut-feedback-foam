export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Persists an in-progress (not-yet-submitted) survey as an "incomplete" row so a
// partially-completed response survives even if the tablet itself is lost/reset.
// The row shares its id with the eventual final submission, so it is later
// promoted to "complete" by the submit/sync route.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, patientName, fatherName, mrnNo, dateOfProcedure, contactNumber, language, answers, startedAt, deviceId } = body

    if (!id || !dateOfProcedure) {
      return Response.json({ success: false, error: 'Missing id or dateOfProcedure' }, { status: 400 })
    }

    // Never downgrade an already-submitted survey back to incomplete.
    const existing = await prisma.surveyResponse.findUnique({
      where: { id },
      select: { status: true },
    })
    if (existing?.status === 'complete') {
      return Response.json({ success: true, alreadyComplete: true })
    }

    await prisma.surveyResponse.upsert({
      where: { id },
      create: {
        id,
        patientName: patientName || '',
        fatherName: fatherName || '',
        mrnNo: mrnNo || '',
        dateOfProcedure: new Date(dateOfProcedure),
        contactNumber: contactNumber || '',
        language: language || 'en',
        answers: answers ?? {},
        status: 'incomplete',
        submittedAt: startedAt ? new Date(startedAt) : new Date(),
        deviceId,
        staffAssisted: Array.isArray(answers?.q57) && answers.q57.length > 0,
      },
      update: {
        patientName: patientName || '',
        fatherName: fatherName || '',
        mrnNo: mrnNo || '',
        dateOfProcedure: new Date(dateOfProcedure),
        contactNumber: contactNumber || '',
        language: language || 'en',
        answers: answers ?? {},
        status: 'incomplete',
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Draft sync error:', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
