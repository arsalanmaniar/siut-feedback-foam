import { getPendingResponses, markResponseSynced } from './offline-db'

let syncing = false

export async function syncPendingResponses(): Promise<number> {
  if (syncing || !navigator.onLine) return 0
  syncing = true
  let synced = 0
  try {
    const pending = await getPendingResponses()
    for (const response of pending) {
      try {
        const res = await fetch('/api/survey/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        if (res.ok) {
          await markResponseSynced(response.id)
          synced++
        }
      } catch {
        // network error — will retry next time
      }
    }
  } finally {
    syncing = false
  }
  return synced
}

export function registerSyncListeners(onSync?: (count: number) => void) {
  function attempt() {
    syncPendingResponses().then((n) => {
      if (n > 0 && onSync) onSync(n)
    })
  }
  window.addEventListener('online', attempt)
  attempt()
  return () => window.removeEventListener('online', attempt)
}
