export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import questionsData from '@/data/survey-questions.json'
import en from '@/locales/en.json'

type Answers = Record<string, unknown>

function getLabel(key: string): string {
  return (en as Record<string, string>)[key] ?? key
}

function renderAnswer(qId: number, answers: Answers): string {
  const raw = answers[`q${qId}`]
  if (raw === undefined || raw === null) return '–'
  if (Array.isArray(raw)) {
    return raw
      .map((v) => {
        const q = questionsData.questions.find((q) => q.id === qId)
        const opt = (q as { options?: Array<{ value: number; labelKey: string }> })?.options?.find((o) => o.value === v)
        return opt ? getLabel(opt.labelKey) : String(v)
      })
      .join(', ')
  }
  if (typeof raw === 'number') {
    const q = questionsData.questions.find((q) => q.id === qId)
    const opt = (q as { options?: Array<{ value: number; labelKey: string }> })?.options?.find((o) => o.value === raw)
    return opt ? getLabel(opt.labelKey) : String(raw)
  }
  return String(raw)
}

export default async function ResponseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await prisma.surveyResponse.findUnique({ where: { id } })
  if (!response) notFound()

  const answers = response.answers as Answers

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/responses" className="text-red-600 hover:text-red-800 text-sm">← Back to Responses</Link>
        <h1 className="text-2xl font-bold text-gray-800">Response Detail</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Patient Information</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-gray-500">Patient Name</dt><dd className="text-gray-800 font-medium">{response.patientName}</dd>
          <dt className="text-gray-500">Father Name</dt><dd className="text-gray-800">{response.fatherName}</dd>
          <dt className="text-gray-500">MRN No.</dt><dd className="text-gray-800 font-mono">{response.mrnNo}</dd>
          <dt className="text-gray-500">Date of Procedure</dt><dd className="text-gray-800">{response.dateOfProcedure.toLocaleDateString()}</dd>
          <dt className="text-gray-500">Contact Number</dt><dd className="text-gray-800">{response.contactNumber}</dd>
          <dt className="text-gray-500">Language</dt><dd className="text-gray-800">{response.language === 'ur' ? 'Urdu' : 'English'}</dd>
          <dt className="text-gray-500">Submitted At</dt><dd className="text-gray-800">{response.submittedAt.toLocaleString()}</dd>
          <dt className="text-gray-500">Synced At</dt><dd className="text-gray-800">{response.syncedAt?.toLocaleString() ?? '–'}</dd>
          {response.deviceId && <><dt className="text-gray-500">Device ID</dt><dd className="text-gray-800 font-mono text-xs">{response.deviceId}</dd></>}
        </dl>
      </div>

      <div className="flex flex-col gap-4">
        {questionsData.questions
          .filter((q) => q.type !== 'placeholder')
          .map((q) => {
            const answered = answers[`q${q.id}`]
            if (answered === undefined || answered === null) return null
            return (
              <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Q{q.id}</p>
                <p className="text-sm font-medium text-gray-700 mb-2">{getLabel(`q${q.id}`)}</p>
                <p className="text-sm text-gray-900">{renderAnswer(q.id, answers)}</p>
                {q.otherFieldKey && !!answers[q.otherFieldKey] && (
                  <p className="text-sm text-gray-600 mt-1 italic">{String(answers[q.otherFieldKey])}</p>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
