// Pure helpers for in-progress draft resume eligibility (no IndexedDB/Dexie
// dependency, so they are unit-testable and shared by offline-db).

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export interface DraftLike {
  id: string
  dayKey: string
  updatedAt: string
}

// Given all stored drafts and today's day-key, choose the most recent draft from
// today to resume, and list the ids of stale (older-day) drafts to purge.
export function pickActiveDraft<T extends DraftLike>(
  drafts: T[],
  today: string
): { active: T | null; staleIds: string[] } {
  const staleIds = drafts.filter((d) => d.dayKey !== today).map((d) => d.id)
  const active =
    drafts
      .filter((d) => d.dayKey === today)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  return { active, staleIds }
}
