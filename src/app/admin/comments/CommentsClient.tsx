'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/admin/ConfirmModal'
import Toast from '@/components/admin/Toast'
import { getSupabaseClient } from '@/lib/supabase'
import type { RowCategory, CommentRow } from './page'

const LABELS: Record<RowCategory, string> = {
  positive:    'Positive',
  negative:    'Negative',
  improvement: 'Improvement',
  none:        'No Comment',
}

// Order of the summary cards / filter tabs (excludes the leading "All" tab)
const CARD_ORDER: RowCategory[] = ['positive', 'negative', 'improvement', 'none']

const CATEGORIES: { value: RowCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...CARD_ORDER.map((c) => ({ value: c, label: LABELS[c] })),
]

const TAG: Record<RowCategory, { bg: string; text: string; dot: string }> = {
  positive:    { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  negative:    { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  improvement: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'  },
  none:        { bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400'   },
}

const CARD: Record<RowCategory, { bg: string; border: string; num: string }> = {
  positive:    { bg: 'bg-green-50',  border: 'border-green-200', num: 'text-green-700'  },
  negative:    { bg: 'bg-red-50',    border: 'border-red-200',   num: 'text-red-700'    },
  improvement: { bg: 'bg-amber-50',  border: 'border-amber-200', num: 'text-amber-700'  },
  none:        { bg: 'bg-gray-50',   border: 'border-gray-200',  num: 'text-gray-700'   },
}

function CategoryTag({ category }: { category: RowCategory }) {
  const s = TAG[category]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {LABELS[category]}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Edit modal ───────────────────────────────────────────────────────────────
function EditCommentModal({
  comment,
  onSave,
  onCancel,
}: {
  comment: CommentRow
  onSave: (text: string, category: RowCategory) => Promise<void>
  onCancel: () => void
}) {
  const [text, setText] = useState(comment.text)
  const [category, setCategory] = useState<RowCategory>(comment.category)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(text.trim(), category)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Edit Comment</h3>
        <p className="text-xs text-gray-500 mb-4">
          {comment.patientName} · {comment.mrnNo} · {formatDate(comment.submittedAt)}
        </p>

        <label className="block text-xs font-medium text-gray-600 mb-1">Comment text</label>
        <textarea
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 resize-y mb-4"
        />

        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as RowCategory)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 mb-5"
        >
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="improvement">Improvement</option>
          <option value="none">No Comment</option>
        </select>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommentsClient({ comments: initial }: { comments: CommentRow[] }) {
  const router = useRouter()
  const [active, setActive] = useState<RowCategory | 'all'>('all')
  const [editTarget, setEditTarget] = useState<CommentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const counts = {
    all:         initial.length,
    positive:    initial.filter(c => c.category === 'positive').length,
    negative:    initial.filter(c => c.category === 'negative').length,
    improvement: initial.filter(c => c.category === 'improvement').length,
    none:        initial.filter(c => c.category === 'none').length,
  }

  const filtered = active === 'all' ? initial : initial.filter(c => c.category === active)

  const getToken = useCallback(async () => {
    const { data: { session } } = await getSupabaseClient().auth.getSession()
    return session?.access_token ?? ''
  }, [])

  async function handleEdit(text: string, category: RowCategory) {
    if (!editTarget) return
    const token = await getToken()
    const res = await fetch(`/api/admin/responses/${editTarget.id}/comment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text, categoryOverride: category }),
    })
    if (res.ok) {
      setToast({ message: 'Comment updated successfully.', type: 'success' })
      setEditTarget(null)
      router.refresh()
    } else {
      setToast({ message: 'Update failed — please try again.', type: 'error' })
    }
  }

  async function confirmDeleteComment() {
    if (!deleteTarget) return
    setDeleting(true)
    const token = await getToken()
    const res = await fetch(`/api/admin/responses/${deleteTarget.id}/comment`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (res.ok) {
      setToast({ message: `Comment by "${deleteTarget.patientName}" removed.`, type: 'success' })
      setDeleteTarget(null)
      router.refresh()
    } else {
      setToast({ message: 'Delete failed — please try again.', type: 'error' })
    }
    setDeleting(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {editTarget && (
        <EditCommentModal
          comment={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Comment"
          message={`This will permanently clear the Q55 comment for "${deleteTarget.patientName}" (MRN: ${deleteTarget.mrnNo}). The rest of their survey response is kept. This cannot be undone.`}
          confirmLabel="Delete Comment"
          onConfirm={confirmDeleteComment}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Comments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Free-text responses from Q55 — auto-categorised by sentiment
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {CARD_ORDER.map(cat => {
          const s = CARD[cat]
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`${s.bg} border ${s.border} rounded-xl p-4 text-left transition-all hover:shadow-sm ${active === cat ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
            >
              <div className={`text-3xl font-bold ${s.num}`}>{counts[cat]}</div>
              <div className="text-sm text-gray-600 font-medium mt-0.5">{LABELS[cat]}</div>
            </button>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => {
          const isActive = active === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActive(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {cat.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[cat.value]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Comment list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-6 h-6">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No comments in this category yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.patientName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500 font-mono">{c.mrnNo}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{formatDate(c.submittedAt)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500 capitalize">{c.language}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategoryTag category={c.category} />
                  {/* Edit / Delete only apply to rows that actually have comment text
                      (a row can be manually marked "No Comment" yet still have text) */}
                  {c.text && (
                    <>
                      <button
                        onClick={() => setEditTarget(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        title="Edit comment"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.757l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81 3.34 11.22a.25.25 0 00-.065.108l-.647 2.268 2.268-.647a.25.25 0 00.108-.065L11.19 6.25z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition"
                        title="Delete comment"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 10-1.492-.15l-.66 6.6a.25.25 0 01-.249.225H5.405a.25.25 0 01-.249-.225l-.66-6.6z" />
                        </svg>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Comment text — or a placeholder when the response has none */}
              {c.text ? (
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  &ldquo;{c.text}&rdquo;
                </p>
              ) : (
                <p className="text-gray-400 text-sm italic bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  No comment was left for this response.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
