'use client'

import { useState, CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/admin/ConfirmModal'
import Toast from '@/components/admin/Toast'
import { getSupabaseClient } from '@/lib/supabase'

const INP_BASE  = 'p-2 border-2 rounded-lg text-sm bg-white transition-shadow duration-150'
const BLUR_S: CSSProperties  = { outline: 'none', borderColor: '#d1d5db' }
const FOCUS_S: CSSProperties = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

function FilterInput({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`${INP_BASE} ${className}`} style={focused ? FOCUS_S : BLUR_S}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  )
}

interface ResponseRow {
  id: string
  patientName: string
  fatherName: string
  mrnNo: string
  language: string
  status: string
  submittedAt: Date
  syncedAt: Date | null
  deceased: boolean
}

interface Filters {
  q?: string
  lang?: string
  from?: string
  to?: string
}

export default function ResponsesClient({
  responses,
  initialFilters,
}: {
  responses: ResponseRow[]
  initialFilters: Filters
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialFilters.q ?? '')
  const [lang, setLang] = useState(initialFilters.lang ?? '')
  const [from, setFrom] = useState(initialFilters.from ?? '')
  const [to, setTo] = useState(initialFilters.to ?? '')
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResponseRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      const res = await fetch(`/api/admin/responses/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      })
      if (!res.ok) throw new Error()
      setToast({ message: `Response for "${deleteTarget.patientName}" deleted.`, type: 'success' })
      setDeleteTarget(null)
      router.refresh()
    } catch {
      setToast({ message: 'Delete failed — please try again.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  function applyFilters() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (lang) params.set('lang', lang)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/admin/responses?${params}`)
  }

  async function handleExport(format: 'csv' | 'excel') {
    setExporting(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (lang) params.set('lang', lang)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('format', format)
    const res = await fetch(`/api/admin/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = format === 'csv' ? 'survey-responses.csv' : 'survey-responses.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Survey Response"
          message={`This will permanently delete the full response for "${deleteTarget.patientName}" (MRN: ${deleteTarget.mrnNo}). This cannot be undone.`}
          confirmLabel="Delete Response"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Survey Responses</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <FilterInput value={q} onChange={setQ} placeholder="Search name or MRN…" className="flex-1 min-w-40" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className={INP_BASE}
          style={BLUR_S}
        >
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </select>
        <FilterInput value={from} onChange={setFrom} type="date" />
        <FilterInput value={to}   onChange={setTo}   type="date" />
        <button
          onClick={applyFilters}
          className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Filter
        </button>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          No responses found.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Father Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">MRN</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Language</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Synced</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {responses.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{r.patientName}</td>
                  <td className="px-4 py-3 text-gray-600">{r.fatherName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{r.mrnNo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.language === 'ur' ? 'bg-purple-100 text-purple-700' : r.language === 'roman-ur' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {r.language === 'ur' ? 'Urdu' : r.language === 'roman-ur' ? 'Roman Urdu' : 'English'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {r.status === 'incomplete' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Incomplete</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Complete</span>
                      )}
                      {r.deceased && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700" title="Family reported the child passed away during this stay">
                          Deceased
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500">{r.syncedAt ? new Date(r.syncedAt).toLocaleDateString() : '–'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/responses/${r.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                        title="View"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/responses/${r.id}/edit`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        title="Edit"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.757l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81 3.34 11.22a.25.25 0 00-.065.108l-.647 2.268 2.268-.647a.25.25 0 00.108-.065L11.19 6.25z" />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition"
                        title="Delete"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 10-1.492-.15l-.66 6.6a.25.25 0 01-.249.225H5.405a.25.25 0 01-.249-.225l-.66-6.6z" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
