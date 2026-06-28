import Dexie, { Table } from 'dexie'
import { todayKey, pickActiveDraft } from './draft-utils'

export { todayKey }

export interface PendingResponse {
  id: string
  patientName: string
  fatherName: string
  mrnNo: string
  dateOfProcedure: string
  contactNumber: string
  language: string
  answers: Record<string, unknown>
  submittedAt: string
  deviceId: string
  synced: boolean
}

// In-progress (not-yet-submitted) survey session, auto-saved after every answer
// so an interrupted survey can be resumed instead of starting over.
export interface DraftSession {
  id: string            // becomes the final response id once submitted
  patientName: string
  fatherName: string
  mrnNo: string
  dateOfProcedure: string
  contactNumber: string
  language: string
  answers: Record<string, unknown>
  stage: 'cover' | 'survey'
  currentQIndex: number
  startedAt: string
  updatedAt: string
  dayKey: string        // YYYY-MM-DD — only same-day drafts are offered for resume
  deviceId: string
}

class SurveyDB extends Dexie {
  responses!: Table<PendingResponse, string>
  drafts!: Table<DraftSession, string>

  constructor() {
    super('siut-survey-db')
    this.version(1).stores({
      responses: 'id, synced, submittedAt',
    })
    this.version(2).stores({
      responses: 'id, synced, submittedAt',
      drafts: 'id, dayKey, updatedAt',
    })
  }
}

let db: SurveyDB | null = null

function getDB(): SurveyDB {
  if (!db) db = new SurveyDB()
  return db
}

export async function saveResponseLocally(response: PendingResponse): Promise<void> {
  await getDB().responses.put(response)
}

export async function getPendingResponses(): Promise<PendingResponse[]> {
  return getDB().responses.where('synced').equals(0).toArray()
}

export async function markResponseSynced(id: string): Promise<void> {
  await getDB().responses.update(id, { synced: true })
}

export async function getPendingCount(): Promise<number> {
  return getDB().responses.where('synced').equals(0).count()
}

export async function saveDraft(draft: DraftSession): Promise<void> {
  await getDB().drafts.put(draft)
}

// Returns a resumable draft for the current day, if any. Drafts from previous
// days are considered stale and purged so a new patient always starts fresh.
export async function getActiveDraft(): Promise<DraftSession | null> {
  const all = await getDB().drafts.toArray()
  const { active, staleIds } = pickActiveDraft(all, todayKey())
  if (staleIds.length) await getDB().drafts.bulkDelete(staleIds)
  return active
}

export async function clearDrafts(): Promise<void> {
  await getDB().drafts.clear()
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('siut-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('siut-device-id', id)
  }
  return id
}
