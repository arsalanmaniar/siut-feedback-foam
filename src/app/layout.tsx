import type { Metadata, Viewport } from 'next'
import './globals.css'
import { I18nProvider } from '@/i18n/context'
import ServiceWorkerRegister from '@/components/survey/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'SIUT Pediatric Cardiothoracic Division Hospital Survey',
  description: 'Child Hospital Survey — SIUT Pakistan',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SIUT Survey' },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <I18nProvider>
          <ServiceWorkerRegister />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
