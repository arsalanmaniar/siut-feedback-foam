export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ResponsesClient from './ResponsesClient'

export default async function ResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lang?: string; from?: string; to?: string }>
}) {
  const { q, lang, from, to } = await searchParams

  const responses = await prisma.surveyResponse.findMany({
    where: {
      ...(q ? {
        OR: [
          { patientName: { contains: q, mode: 'insensitive' } },
          { mrnNo: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
      ...(lang ? { language: lang } : {}),
      ...(from || to ? {
        submittedAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
        },
      } : {}),
    },
    orderBy: { submittedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      patientName: true,
      fatherName: true,
      mrnNo: true,
      language: true,
      status: true,
      submittedAt: true,
      syncedAt: true,
      answers: true,
    },
  })

  // Derive the "deceased" flag (Q58 = Yes) server-side; don't ship full answers to the client.
  const rows = responses.map(({ answers, ...r }) => ({
    ...r,
    deceased: (answers as Record<string, unknown>)?.q58 === 1,
  }))

  return <ResponsesClient responses={rows} initialFilters={{ q, lang, from, to }} />
}
