'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/context'

interface Option {
  value: number
  labelKey: string
}

interface RadioGroupProps {
  name: string
  options: Option[]
  value: number | null
  onChange: (value: number) => void
}

export default function RadioGroup({ name, options, value, onChange }: RadioGroupProps) {
  const { t, dir } = useI18n()
  const [tapping, setTapping] = useState<number | null>(null)

  function handleSelect(v: number) {
    setTapping(v)
    onChange(v)
    setTimeout(() => setTapping(null), 200)
  }

  return (
    <div className="flex flex-col gap-3" dir={dir}>
      {options.map((opt) => {
        const isSelected = value === opt.value
        const isTapping  = tapping === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            style={isTapping
              ? { transform: 'scale(1.02)', transition: 'transform 0.1s ease' }
              : { transform: 'scale(1)',    transition: 'transform 0.18s ease' }}
            className={[
              'relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left',
              'min-h-[68px] select-none active:scale-[0.99] transition-shadow duration-150',
              isSelected
                ? 'border-green-600 bg-green-600 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm',
            ].join(' ')}
          >
            {/* Radio indicator */}
            <span className={[
              'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150',
              isSelected ? 'border-white bg-white' : 'border-gray-300 bg-white',
            ].join(' ')}>
              {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-green-600 block" />}
            </span>

            {/* Label */}
            <span className={[
              'flex-1 text-base font-medium leading-snug transition-colors duration-150',
              isSelected ? 'text-white' : 'text-gray-800',
            ].join(' ')}>
              {t(opt.labelKey as never)}
            </span>

            {/* Selected checkmark on right */}
            {isSelected && (
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}

            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => handleSelect(opt.value)}
              tabIndex={-1}
              className="sr-only"
            />
          </button>
        )
      })}
    </div>
  )
}
