'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import en from '@/locales/en.json'
import ur from '@/locales/ur.json'
import romanUr from '@/locales/roman-ur.json'

export type Locale = 'en' | 'ur' | 'roman-ur'
type Dict = typeof en

const dicts: Record<Locale, Dict> = { en, ur, 'roman-ur': romanUr as Dict }

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof Dict, vars?: Record<string, string | number>) => string
  dir: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>): string => {
      let str = (dicts[locale][key] as string) ?? (dicts.en[key] as string) ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v))
        }
      }
      return str
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir: locale === 'ur' ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
