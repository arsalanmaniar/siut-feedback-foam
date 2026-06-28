export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import StatCard from '@/components/dashboard/StatCard'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'

type Answers = Record<string, unknown>

// Maps the text labels stored by the Excel import → the numeric option codes the
// original survey form stores. Lets both formats work transparently.
const TEXT_TO_NUM: Record<string, number> = {
  // Frequency scale (q7-q19, q21-q22, q24-q25, q30-q31, q42)
  'Never': 1, 'Sometimes': 2, 'Usually': 3, 'Always': 4, 'Not Applicable': 5,
  // Yes/Definitely scale (q3-q5, q20, q27, q29, q32-q40, q43-q44)
  'Yes, Definitely': 1, 'Yes, Somewhat': 2, 'No': 3,
  // Q46 Recommend
  'Definitely No': 1, 'Probably No': 2, 'Probably Yes': 3, 'Definitely Yes': 4,
}

function getNum(answers: Answers, key: string): number | null {
  const v = answers[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    // Q45 hospital rating is stored as a numeric string ("0"–"10") by the import
    if (key === 'q45') { const n = parseInt(v, 10); return isNaN(n) ? null : n }
    return TEXT_TO_NUM[v] ?? null
  }
  return null
}

function pctAlwaysQuestions(responses: Array<{ answers: unknown }>, qKeys: string[]): number {
  const perQ = qKeys.map((key) => {
    const valid = responses.filter((r) => {
      const v = getNum(r.answers as Answers, key)
      return v !== null && v !== 5
    })
    if (valid.length === 0) return 0
    const top = valid.filter((r) => getNum(r.answers as Answers, key) === 4)
    return (top.length / valid.length) * 100
  })
  if (perQ.length === 0) return 0
  return Math.round(perQ.reduce((a, b) => a + b, 0) / perQ.length)
}

function pctTopAnswer(responses: Array<{ answers: unknown }>, qKeys: string[], topVal: number): number {
  const perQ = qKeys.map((key) => {
    const valid = responses.filter((r) => getNum(r.answers as Answers, key) !== null)
    if (valid.length === 0) return 0
    const top = valid.filter((r) => getNum(r.answers as Answers, key) === topVal)
    return (top.length / valid.length) * 100
  })
  if (perQ.length === 0) return 0
  return Math.round(perQ.reduce((a, b) => a + b, 0) / perQ.length)
}

export default async function AnalyticsPage() {
  const responses = await prisma.surveyResponse.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 1000,
    select: { answers: true, language: true },
  })

  const total = responses.length

  // Average hospital rating (Q45: 0–10)
  const ratedResponses = responses.filter((r) => getNum(r.answers as Answers, 'q45') !== null)
  const avgRating =
    ratedResponses.length > 0
      ? Math.round(
          (ratedResponses.reduce((sum, r) => sum + (getNum(r.answers as Answers, 'q45') as number), 0) /
            ratedResponses.length) *
            10
        ) / 10
      : 0

  // % Would recommend (Q46 = 3 "probably yes" or 4 "definitely yes")
  const recAnswered = responses.filter((r) => getNum(r.answers as Answers, 'q46') !== null)
  const pctRecommend =
    recAnswered.length > 0
      ? Math.round(
          (recAnswered.filter((r) => {
            const v = getNum(r.answers as Answers, 'q46')
            return v === 3 || v === 4
          }).length /
            recAnswered.length) *
            100
        )
      : 0

  const nurseScore = pctAlwaysQuestions(responses, ['q7', 'q8', 'q9', 'q13', 'q14', 'q15'])
  const doctorScore = pctAlwaysQuestions(responses, ['q10', 'q11', 'q12', 'q16', 'q17', 'q18'])

  // Section satisfaction scores
  const sectionData = [
    { section: 'Admission', score: pctTopAnswer(responses, ['q3', 'q4', 'q5'], 1) },
    { section: 'Child Nurses', score: pctAlwaysQuestions(responses, ['q7', 'q8', 'q9']) },
    { section: 'Parent Nurses', score: pctAlwaysQuestions(responses, ['q13', 'q14', 'q15']) },
    { section: 'Child Doctors', score: pctAlwaysQuestions(responses, ['q10', 'q11', 'q12']) },
    { section: 'Parent Doctors', score: pctAlwaysQuestions(responses, ['q16', 'q17', 'q18']) },
    { section: 'Environment', score: pctAlwaysQuestions(responses, ['q30', 'q31']) },
    { section: 'Discharge', score: pctTopAnswer(responses, ['q33', 'q34'], 1) },
  ]

  // Hospital rating distribution (Q45: 0–10)
  const ratingCounts: Record<number, number> = {}
  for (let i = 0; i <= 10; i++) ratingCounts[i] = 0
  for (const r of responses) {
    const v = getNum(r.answers as Answers, 'q45')
    if (v !== null && v >= 0 && v <= 10) ratingCounts[v]++
  }
  const ratingData = Object.entries(ratingCounts).map(([rating, count]) => ({ rating, count }))

  // Relation to child (Q50)
  const relationLabels: Record<number, string> = {
    1: 'Mother', 2: 'Father', 3: 'Grandmother',
    4: 'Grandfather', 5: 'Other Relative', 6: 'Someone Else',
  }
  const TEXT_TO_RELATION: Record<string, string> = {
    'Mother': 'Mother', 'Father': 'Father',
    'Grandmother': 'Grandmother', 'Grandfather': 'Grandfather',
    'Other relative or legal guardian': 'Other Relative', 'Other Relative': 'Other Relative',
    'Someone else': 'Someone Else', 'Someone Else': 'Someone Else',
  }
  const relationCounts: Record<string, number> = {}
  for (const r of responses) {
    const v = (r.answers as Answers)['q50']
    let label: string | null = null
    if (typeof v === 'number') label = relationLabels[v] ?? 'Other'
    else if (typeof v === 'string') label = TEXT_TO_RELATION[v] ?? v
    if (label) relationCounts[label] = (relationCounts[label] ?? 0) + 1
  }
  const relationData = Object.entries(relationCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Age group (Q51)
  const ageLabels: Record<number, string> = {
    0: '<18', 1: '18–24', 2: '25–34', 3: '35–44',
    4: '45–54', 5: '55–64', 6: '65–74', 7: '75+',
  }
  // Excel import stores age as "25-34" (hyphen); ageLabels use "25–34" (en-dash)
  const TEXT_TO_AGE: Record<string, string> = {
    '<18': '<18', 'Under 18': '<18',
    '18-24': '18–24', '18–24': '18–24',
    '25-34': '25–34', '25–34': '25–34',
    '35-44': '35–44', '35–44': '35–44',
    '45-54': '45–54', '45–54': '45–54',
    '55-64': '55–64', '55–64': '55–64',
    '65-74': '65–74', '65–74': '65–74',
    '75+': '75+', '75 and older': '75+',
  }
  const ageCounts: Record<string, number> = {}
  for (const r of responses) {
    const v = (r.answers as Answers)['q51']
    let label: string | null = null
    if (typeof v === 'number') label = ageLabels[v] ?? 'Unknown'
    else if (typeof v === 'string') label = TEXT_TO_AGE[v] ?? v
    if (label) ageCounts[label] = (ageCounts[label] ?? 0) + 1
  }
  const ageData = Object.keys(ageLabels)
    .map((k) => ({ name: ageLabels[Number(k)], value: ageCounts[ageLabels[Number(k)]] ?? 0 }))

  // Nurse vs Doctor comparison
  const nurseVsDoctor = [
    { category: 'Child Nurses', score: pctAlwaysQuestions(responses, ['q7', 'q8', 'q9']) },
    { category: 'Parent Nurses', score: pctAlwaysQuestions(responses, ['q13', 'q14', 'q15']) },
    { category: 'Child Doctors', score: pctAlwaysQuestions(responses, ['q10', 'q11', 'q12']) },
    { category: 'Parent Doctors', score: pctAlwaysQuestions(responses, ['q16', 'q17', 'q18']) },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analytics &amp; Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Based on {total.toLocaleString()} response{total !== 1 ? 's' : ''} (most recent 1,000 analysed)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Avg. Hospital Rating" value={`${avgRating} / 10`} color="blue" />
        <StatCard label="Would Recommend" value={`${pctRecommend}%`} sub="definitely or probably" color="green" />
        <StatCard label="Nurse Satisfaction" value={`${nurseScore}%`} sub="% always" color="purple" />
        <StatCard label="Doctor Satisfaction" value={`${doctorScore}%`} sub="% always" color="orange" />
      </div>

      <AnalyticsCharts
        sectionData={sectionData}
        ratingData={ratingData}
        relationData={relationData}
        nurseVsDoctor={nurseVsDoctor}
        ageData={ageData}
        total={total}
      />
    </div>
  )
}
