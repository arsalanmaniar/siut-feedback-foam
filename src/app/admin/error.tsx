'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDbError =
    error.message?.includes('connect') ||
    error.message?.includes('database') ||
    error.message?.includes('prisma') ||
    error.message?.includes('postgres') ||
    error.message?.toLowerCase().includes('invalid')

  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="w-6 h-6">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {isDbError ? 'Database not connected' : 'Something went wrong'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isDbError
            ? 'Add your Supabase DATABASE_URL and DIRECT_URL to .env.local, then restart the dev server.'
            : error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
