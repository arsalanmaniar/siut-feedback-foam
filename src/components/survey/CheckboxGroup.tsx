'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/context'

interface Option {
  value: number
  labelKey: string
}

interface CheckboxGroupProps {
  name: string
  options: Option[]
  values: number[]
  onChange: (values: number[]) => void
}

export default function CheckboxGroup({ name, options, values, onChange }: CheckboxGroupProps) {
  const { t, dir } = useI18n()
  const [tapping, setTapping] = useState<number | null>(null)

  function toggle(v: number) {
    setTapping(v)
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
    setTimeout(() => setTapping(null), 200)
  }

  return (
    <div className="flex flex-col gap-3" dir={dir}>
      {options.map((opt) => {
        const isChecked = values.includes(opt.value)
        const isTapping = tapping === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={isTapping
              ? { transform: 'scale(1.02)', transition: 'transform 0.1s ease' }
              : { transform: 'scale(1)',    transition: 'transform 0.18s ease' }}
            className={[
              'relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left',
              'min-h-[68px] select-none active:scale-[0.99] transition-shadow duration-150',
              isChecked
                ? 'border-green-600 bg-green-600 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm',
            ].join(' ')}
          >
            {/* Checkbox indicator */}
            <span className={[
              'shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150',
              isChecked ? 'border-white bg-white' : 'border-gray-300 bg-white',
            ].join(' ')}>
              {isChecked && (
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>

            {/* Label */}
            <span className={[
              'flex-1 text-base font-medium leading-snug transition-colors duration-150',
              isChecked ? 'text-white' : 'text-gray-800',
            ].join(' ')}>
              {t(opt.labelKey as never)}
            </span>

            {/* Selected tick on right */}
            {isChecked && (
              <span className="shrink-0 text-white/80 text-lg font-bold">✓</span>
            )}

            <input
              type="checkbox"
              name={`${name}_${opt.value}`}
              value={opt.value}
              checked={isChecked}
              onChange={() => toggle(opt.value)}
              tabIndex={-1}
              className="sr-only"
            />
          </button>
        )
      })}
    </div>
  )
}
