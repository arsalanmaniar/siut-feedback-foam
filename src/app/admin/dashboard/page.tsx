export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import StatCard from '@/components/dashboard/StatCard'
import {
  ResponsesOverTimeChart,
  LanguagePieChart,
  SatisfactionBarChart,
} from '@/components/dashboard/ResponseChart'

// Same text→number map as Analytics — imported Excel data stores answer text,
// live survey form stores numeric option codes. Both must resolve to a number.
const TEXT_TO_NUM: Record<string, number> = {
  'Never': 1, 'Sometimes': 2, 'Usually': 3, 'Always': 4, 'Not Applicable': 5,
  'Yes, Definitely': 1, 'Yes, Somewhat': 2, 'No': 3,
  'Definitely Yes': 1, 'Probably Yes': 2, 'Probably No': 3, 'Definitely No': 4,
}

function resolveNum(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return TEXT_TO_NUM[v] ?? null
  return null
}

function getAnswerPct(responses: Array<{ answers: unknown }>, qKey: string, targetValue: number): number {
  const vals = responses
    .map((r) => resolveNum((r.answers as Record<string, unknown>)?.[qKey]))
    .filter((v): v is number => v !== null)
  if (vals.length === 0) return 0
  return Math.round(vals.filter((v) => v === targetValue).length / vals.length * 100)
}

export default async function DashboardPage() {
  // Exclude incomplete (auto-saved, not-yet-submitted) drafts from all dashboard stats.
  const completeOnly = { status: { not: 'incomplete' } }
  const [total, responses] = await Promise.all([
    prisma.surveyResponse.count({ where: completeOnly }),
    prisma.surveyResponse.findMany({
      where: completeOnly,
      orderBy: { dateOfProcedure: 'desc' },
      take: 500,
      select: { dateOfProcedure: true, language: true, answers: true },
    }),
  ])

  // Group by the actual procedure date (the meaningful clinical date) rather than
  // submittedAt, which only reflects when the record was digitised/imported.
  const byDay: Record<string, number> = {}
  for (const r of responses) {
    const d = r.dateOfProcedure.toISOString().slice(0, 10)
    byDay[d] = (byDay[d] ?? 0) + 1
  }
  const timeData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }))

  // "This Month" — procedures that took place in the current calendar month
  const now = new Date()
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const thisMonthCount = responses.filter(
    (r) => r.dateOfProcedure.toISOString().slice(0, 7) === monthPrefix
  ).length

  const enCount = responses.filter((r) => r.language === 'en').length
  const urCount = responses.filter((r) => r.language === 'ur').length
  const langData = [
    { name: 'English', value: enCount },
    { name: 'Urdu', value: urCount },
  ]

  const satisfactionData = [
    { label: 'Nurses courteous (Q15)', pct: getAnswerPct(responses, 'q15', 4) },
    { label: 'Doctors courteous (Q18)', pct: getAnswerPct(responses, 'q18', 4) },
    { label: 'Ready to leave (Q33)', pct: getAnswerPct(responses, 'q33', 1) },
    { label: 'Discharge info (Q34)', pct: getAnswerPct(responses, 'q34', 1) },
    { label: 'Room cleanliness (Q30)', pct: getAnswerPct(responses, 'q30', 4) },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Survey Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Responses" value={total} color="blue" />
        <StatCard label="English" value={enCount} sub={`${total ? Math.round((enCount / total) * 100) : 0}%`} color="green" />
        <StatCard label="Urdu" value={urCount} sub={`${total ? Math.round((urCount / total) * 100) : 0}%`} color="purple" />
        <StatCard label="This Month" value={thisMonthCount} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Responses Over Time (Last 30 Days)</h2>
          <ResponsesOverTimeChart data={timeData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Language Breakdown</h2>
          <LanguagePieChart data={langData} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Key Satisfaction Metrics (% best score)</h2>
        <SatisfactionBarChart data={satisfactionData} />
      </div>
    </div>
  )
}
