export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import questionsData from '@/data/survey-questions.json'
import en from '@/locales/en.json'

type Answers = Record<string, unknown>

function getLabelEn(key: string): string {
  return (en as Record<string, string>)[key] ?? key
}

function flattenAnswers(answers: Answers) {
  const result: Record<string, string> = {}
  for (const q of questionsData.questions) {
    if (q.type === 'placeholder') continue
    const raw = answers[`q${q.id}`]
    if (raw === undefined || raw === null) {
      result[`q${q.id}`] = ''
      continue
    }
    if (Array.isArray(raw)) {
      result[`q${q.id}`] = raw
        .map((v) => {
          const opt = (q as { options?: Array<{ value: number; labelKey: string }> })?.options?.find((o) => o.value === v)
          return opt ? getLabelEn(opt.labelKey) : String(v)
        })
        .join(' | ')
    } else if (typeof raw === 'number') {
      const opt = (q as { options?: Array<{ value: number; labelKey: string }> })?.options?.find((o) => o.value === raw)
      result[`q${q.id}`] = opt ? getLabelEn(opt.labelKey) : String(raw)
    } else {
      result[`q${q.id}`] = String(raw)
    }
    if (q.otherFieldKey && answers[q.otherFieldKey]) {
      result[q.otherFieldKey] = String(answers[q.otherFieldKey])
    }
  }
  return result
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const lang = searchParams.get('lang')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = searchParams.get('format') ?? 'csv'

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
  })

  const rows = responses.map((r) => ({
    id: r.id,
    patientName: r.patientName,
    fatherName: r.fatherName,
    mrnNo: r.mrnNo,
    dateOfProcedure: r.dateOfProcedure.toISOString().slice(0, 10),
    contactNumber: r.contactNumber,
    language: r.language,
    submittedAt: r.submittedAt.toISOString(),
    syncedAt: r.syncedAt?.toISOString() ?? '',
    deviceId: r.deviceId ?? '',
    staffAssisted: r.staffAssisted ? 'Yes' : 'No',
    ...flattenAnswers(r.answers as Answers),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="survey-responses.csv"',
      },
    })
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="survey-responses.xlsx"',
    },
  })
}
