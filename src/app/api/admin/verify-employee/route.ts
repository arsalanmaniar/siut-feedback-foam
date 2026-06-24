export const dynamic = 'force-dynamic'

// Employee ID login was removed — this endpoint is no longer used.
export async function POST() {
  return Response.json({ error: 'Not found' }, { status: 404 })
}
