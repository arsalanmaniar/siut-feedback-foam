'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import questionsData from '@/data/survey-questions.json'
import en from '@/locales/en.json'
import Toast from '@/components/admin/Toast'
import { getSupabaseClient } from '@/lib/supabase'

type QuestionConfig = {
  id: number
  section: string
  type: string
  fieldKey?: string
  otherFieldKey?: string
  options?: Array<{ value: number; labelKey: string }>
}

const questions = questionsData.questions as QuestionConfig[]
const labels = en as Record<string, string>

const SECTION_LABELS: Record<string, string> = {
  admission:            'When Your Child Was Admitted',
  care_after_admission: 'Care After Admission',
  child_nurses:         "Your Child's Experience with Nurses",
  child_doctors:        "Your Child's Experience with Doctors",
  parent_nurses:        'Your Experience with Nurses',
  parent_doctors:       'Your Experience with Doctors',
  providers:            'Your Experience with Providers',
  child_care:           "Your Child's Care",
  environment:          'Hospital Environment',
  discharge:            'When Your Child Left the Hospital',
  teen:                 "Your Teen's Care",
  overall_rating:       'Overall Rating',
  about_you:            'About You',
}

const INP = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition'

function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={INP} />
    </div>
  )
}

function QuestionInput({ q, value, onChange }: { q: QuestionConfig; value: unknown; onChange: (key: string, val: unknown) => void }) {
  const key = `q${q.id}`
  const qLabel = labels[key] ?? `Question ${q.id}`

  if (q.type === 'placeholder') return null

  if (q.type === 'textarea') {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">Q{q.id}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{qLabel}</label>
        <textarea
          rows={3}
          value={typeof value === 'string' ? value : ''}
          onChange={e => {
            onChange(q.fieldKey ?? key, e.target.value)
          }}
          className={INP + ' resize-y'}
          placeholder={labels[q.fieldKey ? `${q.fieldKey}_placeholder` : `q${q.id}_placeholder`] ?? ''}
        />
      </div>
    )
  }

  if (q.type === 'checkbox' && q.options) {
    const current = Array.isArray(value) ? (value as number[]) : []
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">Q{q.id}</p>
        <p className="text-sm font-medium text-gray-700 mb-2">{qLabel}</p>
        <div className="flex flex-col gap-1.5">
          {q.options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={current.includes(opt.value)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...current, opt.value]
                    : current.filter(v => v !== opt.value)
                  onChange(key, next)
                }}
                className="w-4 h-4 accent-red-600"
              />
              {labels[opt.labelKey] ?? opt.labelKey}
            </label>
          ))}
        </div>
        {q.otherFieldKey && (
          <input
            type="text"
            value={typeof (value as Record<string, unknown>)?.[q.otherFieldKey] === 'string' ? String((value as Record<string, unknown>)[q.otherFieldKey]) : ''}
            onChange={e => onChange(q.otherFieldKey!, e.target.value)}
            placeholder="Other (specify)"
            className={INP + ' mt-2'}
          />
        )}
      </div>
    )
  }

  // radio (default)
  if (q.options) {
    const current = typeof value === 'number' ? value : null
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">Q{q.id}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{qLabel}</label>
        <select
          value={current ?? ''}
          onChange={e => onChange(key, e.target.value === '' ? null : Number(e.target.value))}
          className={INP}
        >
          <option value="">— not answered —</option>
          {q.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {labels[opt.labelKey] ?? opt.labelKey}
            </option>
          ))}
        </select>
        {q.otherFieldKey && current !== null && (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(q.otherFieldKey!, e.target.value)}
            placeholder="Specify other…"
            className={INP + ' mt-2'}
          />
        )}
      </div>
    )
  }

  return null
}

// Group questions by section
function groupBySection() {
  const groups: Array<{ section: string; qs: QuestionConfig[] }> = []
  for (const q of questions) {
    if (q.type === 'placeholder') continue
    const last = groups[groups.length - 1]
    if (last && last.section === q.section) {
      last.qs.push(q)
    } else {
      groups.push({ section: q.section, qs: [q] })
    }
  }
  return groups
}

const SECTIONS = groupBySection()

interface Props {
  id: string
  patientName: string
  fatherName: string
  mrnNo: string
  dateOfProcedure: string
  contactNumber: string
  language: string
  answers: Record<string, unknown>
}

export default function EditResponseForm({ id, answers: initialAnswers, ...initialInfo }: Props) {
  const router = useRouter()
  const [info, setInfo] = useState({
    patientName: initialInfo.patientName,
    fatherName: initialInfo.fatherName,
    mrnNo: initialInfo.mrnNo,
    dateOfProcedure: initialInfo.dateOfProcedure,
    contactNumber: initialInfo.contactNumber,
    language: initialInfo.language,
  })
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleAnswerChange = useCallback((key: string, val: unknown) => {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      const res = await fetch(`/api/admin/responses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ ...info, answers }),
      })
      if (!res.ok) throw new Error('Save failed')
      setToast({ message: 'Response saved successfully', type: 'success' })
      setTimeout(() => router.push('/admin/responses'), 1800)
    } catch {
      setToast({ message: 'Failed to save — please try again', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Patient info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Patient Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Patient Name" value={info.patientName} onChange={v => setInfo(p => ({ ...p, patientName: v }))} />
          <TextInput label="Father Name" value={info.fatherName} onChange={v => setInfo(p => ({ ...p, fatherName: v }))} />
          <TextInput label="MRN No." value={info.mrnNo} onChange={v => setInfo(p => ({ ...p, mrnNo: v }))} />
          <TextInput label="Date of Procedure" type="date" value={info.dateOfProcedure} onChange={v => setInfo(p => ({ ...p, dateOfProcedure: v }))} />
          <TextInput label="Contact Number" value={info.contactNumber} onChange={v => setInfo(p => ({ ...p, contactNumber: v }))} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
            <select value={info.language} onChange={e => setInfo(p => ({ ...p, language: e.target.value }))} className={INP}>
              <option value="en">English</option>
              <option value="roman-ur">Roman Urdu</option>
              <option value="ur">Urdu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Survey answers by section */}
      {SECTIONS.map(({ section, qs }) => (
        <div key={section} className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            {SECTION_LABELS[section] ?? section}
          </h2>
          <div className="flex flex-col gap-3">
            {qs.map(q => (
              <QuestionInput
                key={q.id}
                q={q}
                value={q.fieldKey ? answers[q.fieldKey] : answers[`q${q.id}`]}
                onChange={handleAnswerChange}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Save / Cancel */}
      <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-4 border-t border-gray-200 -mx-6 px-6">
        <button
          onClick={() => router.push('/admin/responses')}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
