'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/context'

interface FreeTextProps {
  value: string
  onChange: (v: string) => void
  placeholderKey?: string
  multiline?: boolean
}

const BASE = 'w-full px-4 py-3.5 border-2 rounded-xl text-base bg-white transition-shadow duration-150'
const BLUR_STYLE  = { outline: 'none', borderColor: '#e5e7eb' }
const FOCUS_STYLE = { outline: 'none', borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.20)' }

export default function FreeText({ value, onChange, placeholderKey, multiline = false }: FreeTextProps) {
  const { t, dir } = useI18n()
  const [focused, setFocused] = useState(false)
  const placeholder = placeholderKey ? t(placeholderKey as never) : ''

  const shared = {
    style:   focused ? FOCUS_STYLE : BLUR_STYLE,
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
    dir,
    placeholder,
  }

  if (multiline) {
    return (
      <textarea
        {...shared}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className={`${BASE} resize-y`}
      />
    )
  }

  return (
    <input
      {...shared}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={BASE}
    />
  )
}
