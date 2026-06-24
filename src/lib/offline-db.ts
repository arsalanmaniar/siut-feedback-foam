import Dexie, { Table } from 'dexie'

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

class SurveyDB extends Dexie {
  responses!: Table<PendingResponse, string>

  constructor() {
    super('siut-survey-db')
    this.version(1).stores({
      responses: 'id, synced, submittedAt',
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

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('siut-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('siut-device-id', id)
  }
  return id
}
