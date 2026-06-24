'use client'

import { useState, CSSProperties } from 'react'

const INP_BASE = 'p-2 border-2 rounded-lg text-sm bg-white transition-shadow duration-150'
const BLUR_S: CSSProperties  = { outline: 'none', borderColor: '#d1d5db' }
const FOCUS_S: CSSProperties = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INP_BASE}
        style={focused ? FOCUS_S : BLUR_S}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

export default function ExportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [lang, setLang] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null)

  async function handleExport(format: 'csv' | 'excel') {
    setExporting(format)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      if (lang) params.set('lang', lang)
      params.set('format', format)

      const res = await fetch(`/api/admin/export?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = format === 'csv' ? 'siut-survey-responses.csv' : 'siut-survey-responses.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  function clearFilters() {
    setFrom('')
    setTo('')
    setLang('')
  }

  const hasFilters = from || to || lang

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Export Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download survey responses as CSV or Excel. Apply filters to narrow the export.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filter Options</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <DateInput label="From date" value={from} onChange={setFrom} />
          <DateInput label="To date"   value={to}   onChange={setTo}   />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Language</label>
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
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">Download</h2>
        <p className="text-xs text-gray-400 mb-5">
          {hasFilters
            ? 'Filtered export — only responses matching the selected criteria will be included.'
            : 'No filters applied — all survey responses will be exported.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {exporting === 'excel' ? 'Exporting…' : 'Export Excel (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-xs text-red-700">
          <span className="font-semibold">What&apos;s included:</span> Patient name, father name, MRN,
          date of procedure, contact number, language, submission date, and all survey question answers
          (Q1–Q57) labelled by question key.
        </p>
      </div>
    </div>
  )
}
