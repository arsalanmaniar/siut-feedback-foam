'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

interface SectionPoint { section: string; score: number }
interface RatingPoint  { rating: string; count: number }
interface PiePoint     { name: string; value: number }
interface NvDPoint     { category: string; score: number }

const RED   = '#dc2626'
const BLUE  = '#2563eb'
const PIE_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2']
// Categorical palette for the 7 section bars — blue, teal, purple, orange, pink, green, indigo
const SECTION_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#ea580c', '#db2777', '#16a34a', '#4f46e5']

function SectionScoresChart({ data }: { data: SectionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="section" tick={{ fontSize: 11 }} width={100} />
        <Tooltip formatter={(v) => [`${v}%`, 'Top Score']} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={SECTION_COLORS[i % SECTION_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function RatingDistributionChart({ data }: { data: RatingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="rating" tick={{ fontSize: 12 }} label={{ value: 'Rating (0–10)', position: 'insideBottom', offset: -4, fontSize: 11 }} height={40} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [v, 'Responses']} />
        <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function RelationPieChart({ data }: { data: PiePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function NurseVsDoctorChart({ data }: { data: NvDPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => [`${v}%`, '% Always']} />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i < 2 ? RED : BLUE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function AgeChart({ data }: { data: PiePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [v, 'Respondents']} />
        <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface AnalyticsChartsProps {
  sectionData: SectionPoint[]
  ratingData: RatingPoint[]
  relationData: PiePoint[]
  nurseVsDoctor: NvDPoint[]
  ageData: PiePoint[]
  total: number
}

export default function AnalyticsCharts({
  sectionData,
  ratingData,
  relationData,
  nurseVsDoctor,
  ageData,
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      {/* Section scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-1">Section Satisfaction Scores</h2>
        <p className="text-xs text-gray-400 mb-4">% of respondents who gave the top answer per section</p>
        <SectionScoresChart data={sectionData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hospital rating distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">Hospital Rating Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">How respondents rated the hospital overall (Q45, 0–10)</p>
          <RatingDistributionChart data={ratingData} />
        </div>

        {/* Nurse vs Doctor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">Nurse vs. Doctor Satisfaction</h2>
          <p className="text-xs text-gray-400 mb-4">
            % &ldquo;Always&rdquo; responses — <span className="text-red-600 font-medium">■ Nurses</span>{' '}
            <span className="text-blue-600 font-medium">■ Doctors</span>
          </p>
          <NurseVsDoctorChart data={nurseVsDoctor} />
        </div>

        {/* Relation to child */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">Relation to Child (Q50)</h2>
          <p className="text-xs text-gray-400 mb-4">Who submitted the survey</p>
          <RelationPieChart data={relationData} />
        </div>

        {/* Age group */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">Respondent Age Groups (Q51)</h2>
          <p className="text-xs text-gray-400 mb-4">Age distribution of survey respondents</p>
          <AgeChart data={ageData} />
        </div>
      </div>
    </div>
  )
}
