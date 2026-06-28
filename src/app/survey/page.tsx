'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useI18n, Locale } from '@/i18n/context'
import QuestionRenderer, { QuestionConfig } from '@/components/survey/QuestionRenderer'
import questionsData from '@/data/survey-questions.json'
import { getVisibleQuestionIds, withDeceasedSideEffects } from '@/lib/skip-logic'
import {
  saveResponseLocally,
  getDeviceId,
  getPendingCount,
  saveDraft,
  getActiveDraft,
  clearDrafts,
  todayKey,
  DraftSession,
} from '@/lib/offline-db'
import { registerSyncListeners } from '@/lib/sync'

type Stage = 'language' | 'cover' | 'survey' | 'done'

interface CoverData {
  patientName: string
  fatherName: string
  mrnNo: string
  dateOfProcedure: string
  contactNumber: string
}

const questions = questionsData.questions as QuestionConfig[]
const allQuestionIds = questions.map((q) => q.id)

const INPUT_BASE  = 'w-full px-4 py-3.5 border-2 rounded-xl text-base bg-white transition-shadow duration-150'
const INPUT_BLUR  = { outline: 'none', borderColor: '#e5e7eb' }
const INPUT_FOCUS = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

function CoverInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_BASE}
        style={focused ? INPUT_FOCUS : INPUT_BLUR}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

export default function SurveyPage() {
  const { locale, setLocale, t, dir } = useI18n()
  const [stage, setStage] = useState<Stage>('language')
  const [dateFocused, setDateFocused] = useState(false)
  const [cover, setCover] = useState<CoverData>({
    patientName: '',
    fatherName: '',
    mrnNo: '',
    dateOfProcedure: '',
    contactNumber: '',
  })
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right')
  const [animKey, setAnimKey] = useState(0)

  // ── Auto-save / resume state ──
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const startedAtRef = useRef<string>('')
  // Refs hold the latest values for the periodic DB-draft sync (avoids stale closures)
  const answersRef = useRef(answers); answersRef.current = answers
  const coverRef = useRef(cover); coverRef.current = cover
  const localeRef = useRef(locale); localeRef.current = locale

  useEffect(() => {
    const cleanup = registerSyncListeners()
    getPendingCount().then(setPendingCount)
    return cleanup
  }, [])

  // Resume an interrupted, same-day session if one is saved locally.
  useEffect(() => {
    let active = true
    getActiveDraft().then((draft) => {
      if (!active) return
      if (draft) {
        setLocale(draft.language as Locale)
        setCover({
          patientName: draft.patientName,
          fatherName: draft.fatherName,
          mrnNo: draft.mrnNo,
          dateOfProcedure: draft.dateOfProcedure,
          contactNumber: draft.contactNumber,
        })
        setAnswers(draft.answers)
        setCurrentQIndex(draft.currentQIndex)
        setSessionId(draft.id)
        startedAtRef.current = draft.startedAt
        setStage(draft.stage)
      }
      setHydrated(true)
    })
    return () => { active = false }
  }, [setLocale])

  // Silently persist progress to IndexedDB after every change.
  useEffect(() => {
    if (!hydrated || !sessionId) return
    if (stage !== 'cover' && stage !== 'survey') return
    const draft: DraftSession = {
      id: sessionId,
      patientName: cover.patientName,
      fatherName: cover.fatherName,
      mrnNo: cover.mrnNo,
      dateOfProcedure: cover.dateOfProcedure,
      contactNumber: cover.contactNumber,
      language: locale,
      answers: answers as Record<string, unknown>,
      stage,
      currentQIndex,
      startedAt: startedAtRef.current || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dayKey: todayKey(),
      deviceId: getDeviceId(),
    }
    void saveDraft(draft)
  }, [hydrated, sessionId, stage, cover, answers, currentQIndex, locale])

  // Periodically back up the in-progress draft to the database (every 30s),
  // so a partial response survives even if the tablet is lost/reset.
  useEffect(() => {
    if (!sessionId || stage !== 'survey') return
    const interval = setInterval(() => {
      if (!navigator.onLine) return
      fetch('/api/survey/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          ...coverRef.current,
          language: localeRef.current,
          answers: answersRef.current,
          startedAt: startedAtRef.current,
          deviceId: getDeviceId(),
        }),
      }).catch(() => { /* offline — local draft still holds the data */ })
    }, 30000)
    return () => clearInterval(interval)
  }, [sessionId, stage])

  function beginSession(l: Locale) {
    setLocale(l)
    setSessionId(crypto.randomUUID())
    startedAtRef.current = new Date().toISOString()
    setStage('cover')
  }

  const visibleIds = getVisibleQuestionIds(allQuestionIds, answers as Record<string, number | number[]>)
  const visibleQuestions = visibleIds.map((id) => questions.find((q) => q.id === id)!)
  const currentQuestion = visibleQuestions[currentQIndex]
  const progress = Math.round(((currentQIndex + 1) / visibleQuestions.length) * 100)

  const handleAnswer = useCallback((key: string, value: unknown) => {
    // withDeceasedSideEffects keeps the discharge questions in sync with the
    // "did your child pass away" screening answer (auto-marks them N/A).
    setAnswers((prev) => withDeceasedSideEffects({ ...prev, [key]: value }))
  }, [])

  function goNext() {
    setSlideDir('right')
    setAnimKey((k) => k + 1)
    setCurrentQIndex((i) => i + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setSlideDir('left')
    setAnimKey((k) => k + 1)
    setCurrentQIndex((i) => i - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function coverComplete() {
    return (
      cover.patientName.trim() &&
      cover.fatherName.trim() &&
      cover.mrnNo.trim() &&
      cover.dateOfProcedure &&
      cover.contactNumber.trim()
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    const id = sessionId ?? crypto.randomUUID()
    const response = {
      id,
      ...cover,
      language: locale,
      answers: answers as Record<string, unknown>,
      submittedAt: new Date().toISOString(),
      deviceId: getDeviceId(),
      synced: false,
    }
    await saveResponseLocally(response)
    try {
      if (navigator.onLine) {
        await fetch('/api/survey/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        await import('@/lib/offline-db').then((m) => m.markResponseSynced(id))
      }
    } catch {
      // offline — syncs later
    }
    // Survey fully submitted — clear the in-progress draft so the next patient
    // starts fresh (the DB draft row, same id, is now finalized as complete).
    await clearDrafts()
    setSessionId(null)
    startedAtRef.current = ''
    setSubmitting(false)
    setStage('done')
  }

  /* ── Language selection ── */
  if (stage === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-700 to-red-900 flex flex-col items-center justify-center p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-4 mb-4 shadow-lg">
            <Image src="/siut-logo-official.png" alt="SIUT" width={140} height={56} className="object-contain" priority />
          </div>
          <p className="text-red-200 mt-1 text-base font-medium">Pediatric Cardiothoracic Division</p>
        </div>

        <p className="text-red-200 text-sm font-medium uppercase tracking-widest mb-6 text-center">
          Select Language / زبان منتخب کریں / Zaban Chunain
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => beginSession('en')}
            className="group relative bg-white text-red-700 font-bold py-5 rounded-2xl text-xl
                       shadow-lg hover:shadow-xl active:scale-[0.98]
                       transition-all duration-150"
          >
            English
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-red-400 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => beginSession('roman-ur')}
            className="group relative bg-white/15 backdrop-blur text-white font-bold py-5 rounded-2xl text-xl
                       border border-white/30 hover:bg-white/25 active:scale-[0.98]
                       transition-all duration-150"
          >
            Roman Urdu
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => beginSession('ur')}
            dir="rtl"
            className="group relative bg-white/10 backdrop-blur text-white font-bold py-5 rounded-2xl text-xl
                       border border-white/20 hover:bg-white/20 active:scale-[0.98]
                       transition-all duration-150"
          >
            اردو
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 group-hover:-translate-x-1 transition-transform">←</span>
          </button>
        </div>

        <p className="text-red-300/50 text-xs mt-10">Developed by Arsalan Maniar</p>
      </div>
    )
  }

  /* ── Cover / Patient Info ── */
  if (stage === 'cover') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex flex-col" dir={dir}>
        <header className="bg-red-700 text-white px-6 py-3 shadow-md flex items-center gap-4">
          <div className="bg-white rounded-xl px-3 py-1.5 shrink-0">
            <Image src="/siut-logo-official.png" alt="SIUT" width={80} height={32} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-red-300 uppercase tracking-widest leading-none mb-0.5">Patient Information</p>
            <h1 className="text-sm font-bold leading-snug truncate">{t('app_title')}</h1>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-5">{t('cover_page_title')}</h2>
            <div className="flex flex-col gap-4">
              <CoverInput
                label={t('patient_name')}
                value={cover.patientName}
                onChange={(v) => setCover((p) => ({ ...p, patientName: v }))}
                placeholder="Full name of patient"
              />
              <CoverInput
                label={t('father_name')}
                value={cover.fatherName}
                onChange={(v) => setCover((p) => ({ ...p, fatherName: v }))}
              />
              <CoverInput
                label={t('mrn_no')}
                value={cover.mrnNo}
                onChange={(v) => setCover((p) => ({ ...p, mrnNo: v }))}
                placeholder="e.g. 123456"
              />
              <CoverInput
                label={t('contact_number')}
                value={cover.contactNumber}
                onChange={(v) => setCover((p) => ({ ...p, contactNumber: v }))}
                type="tel"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {t('date_of_procedure')}
                </label>
                <input
                  type="date"
                  value={cover.dateOfProcedure}
                  onChange={(e) => setCover((p) => ({ ...p, dateOfProcedure: e.target.value }))}
                  className={INPUT_BASE}
                  style={dateFocused ? INPUT_FOCUS : INPUT_BLUR}
                  onFocus={() => setDateFocused(true)}
                  onBlur={() => setDateFocused(false)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStage('survey')}
            disabled={!coverComplete()}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl text-lg
                       shadow-md hover:bg-red-700 active:scale-[0.99]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            {t('start_survey')} →
          </button>
        </main>
      </div>
    )
  }

  /* ── Survey questions ── */
  if (stage === 'survey') {
    const isLast = currentQIndex === visibleQuestions.length - 1
    const currentAnswered = currentQuestion
      ? answers[`q${currentQuestion.id}`] !== undefined
      : false

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex flex-col" dir={dir}>

        {/* Header */}
        <header className="bg-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white rounded-lg px-2.5 py-1 shrink-0">
              <Image src="/siut-logo-official.png" alt="SIUT" width={64} height={26} className="object-contain" />
            </div>
            <span className="text-xs font-medium text-red-200 truncate hidden sm:block">Pediatric Cardiothoracic Division</span>
          </div>
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-full font-bold shrink-0">
              ⏳ {pendingCount} pending
            </span>
          )}
        </header>

        {/* Progress bar */}
        <div className="bg-white border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 shrink-0 w-28">
              Question {currentQIndex + 1} of {visibleQuestions.length}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                }}
              />
            </div>
            <span className="text-sm font-bold text-red-600 shrink-0">{progress}%</span>
          </div>
        </div>

        {/* Question area */}
        <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full">
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
            <div
              key={animKey}
              className={slideDir === 'right' ? 'animate-slide-right' : 'animate-slide-left'}
            >
              {/* Ghost watermark — slides in with each question */}
              <div
                aria-hidden="true"
                className="absolute select-none pointer-events-none font-black leading-none"
                style={{ fontSize: '130px', right: '8px', top: '-12px', color: 'rgba(220,38,38,0.07)' }}
              >
                {String(currentQIndex + 1).padStart(2, '0')}
              </div>

              {/* Question number badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold shrink-0">
                  {currentQIndex + 1}
                </span>
                {currentQuestion?.section && (
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {t((`section_${currentQuestion.section}`) as never)}
                  </span>
                )}
              </div>

              {currentQuestion && (
                <QuestionRenderer
                  question={currentQuestion}
                  answers={answers}
                  onChange={handleAnswer}
                />
              )}
            </div>
          </div>
        </main>

        {/* Navigation footer */}
        <footer className="bg-white border-t border-gray-100 px-5 py-4 flex gap-3 sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {currentQIndex > 0 && (
            <button
              onClick={goBack}
              className="flex-none bg-gray-100 text-gray-700 font-semibold px-6 py-3.5 rounded-xl text-base
                         hover:bg-gray-200 active:scale-[0.97] transition-all duration-150"
            >
              ← {t('back')}
            </button>
          )}
          {!isLast ? (
            <button
              onClick={goNext}
              className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl text-base
                         hover:bg-red-700 active:scale-[0.98] transition-all duration-150
                         shadow-sm shadow-red-200"
            >
              {t('next')} →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !currentAnswered}
              className="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-xl text-base
                         hover:bg-green-700 active:scale-[0.98] transition-all duration-150
                         disabled:opacity-50 shadow-sm shadow-green-200"
            >
              {submitting ? '⏳ ' + t('submitting') : '✓ ' + t('submit')}
            </button>
          )}
        </footer>
      </div>
    )
  }

  /* ── Thank you ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex flex-col items-center justify-center p-8" dir={dir}>
      <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl animate-slide-right">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('thank_you')}</h2>
        <p className="text-gray-500 text-sm mb-6">Your responses have been recorded.</p>
        {!navigator.onLine && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
            {t('offline_notice')}
          </p>
        )}
        <button
          onClick={() => {
            void clearDrafts()
            setSessionId(null)
            startedAtRef.current = ''
            setStage('language')
            setAnswers({})
            setCover({ patientName: '', fatherName: '', mrnNo: '', dateOfProcedure: '', contactNumber: '' })
            setCurrentQIndex(0)
            setAnimKey(0)
          }}
          className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700
                     active:scale-[0.98] transition-all duration-150"
        >
          New Survey
        </button>
      </div>
    </div>
  )
}
