'use client'

import { useI18n } from '@/i18n/context'
import RadioGroup from './RadioGroup'
import CheckboxGroup from './CheckboxGroup'
import FreeText from './FreeText'

export interface QuestionConfig {
  id: number
  section: string
  type: 'radio' | 'checkbox' | 'textarea' | 'number' | 'placeholder'
  options?: Array<{ value: number; labelKey: string }>
  skipRule?: { ifValue: number; goTo: number | 'end' }
  hasOtherText?: boolean
  otherValue?: number
  otherFieldKey?: string
  fieldKey?: string
  note?: string
}

interface QuestionRendererProps {
  question: QuestionConfig
  answers: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export default function QuestionRenderer({ question, answers, onChange }: QuestionRendererProps) {
  const { t, dir } = useI18n()
  const qKey = `q${question.id}`
  const labelKey = `q${question.id}` as never

  if (question.type === 'placeholder') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
        {t(labelKey)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5" dir={dir}>
      <p className="text-xl font-semibold text-gray-900 leading-relaxed tracking-tight">{t(labelKey)}</p>

      {question.type === 'radio' && question.options && (
        <>
          <RadioGroup
            name={qKey}
            options={question.options}
            value={(answers[qKey] as number) ?? null}
            onChange={(v) => onChange(qKey, v)}
          />
          {question.hasOtherText &&
            question.otherValue !== undefined &&
            answers[qKey] === question.otherValue &&
            question.otherFieldKey && (
              <FreeText
                value={(answers[question.otherFieldKey] as string) ?? ''}
                onChange={(v) => onChange(question.otherFieldKey!, v)}
                placeholderKey={`${question.otherFieldKey}_placeholder` as never}
              />
            )}
        </>
      )}

      {question.type === 'checkbox' && question.options && (
        <>
          <CheckboxGroup
            name={qKey}
            options={question.options}
            values={(answers[qKey] as number[]) ?? []}
            onChange={(v) => onChange(qKey, v)}
          />
          {question.hasOtherText &&
            question.otherValue !== undefined &&
            ((answers[qKey] as number[]) ?? []).includes(question.otherValue) &&
            question.otherFieldKey && (
              <FreeText
                value={(answers[question.otherFieldKey] as string) ?? ''}
                onChange={(v) => onChange(question.otherFieldKey!, v)}
                placeholderKey={`${question.otherFieldKey}_placeholder` as never}
              />
            )}
        </>
      )}

      {question.type === 'textarea' && (
        <FreeText
          value={(answers[question.fieldKey ?? qKey] as string) ?? ''}
          onChange={(v) => onChange(question.fieldKey ?? qKey, v)}
          placeholderKey={`${question.fieldKey ?? qKey}_placeholder` as never}
          multiline
        />
      )}

      {question.type === 'number' && (
        <FreeText
          value={(answers[question.fieldKey ?? qKey] as string) ?? ''}
          onChange={(v) => onChange(question.fieldKey ?? qKey, v)}
          placeholderKey={`${question.fieldKey ?? qKey}_placeholder` as never}
          numeric
        />
      )}
    </div>
  )
}
