export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditResponseForm from './EditResponseForm'

export default async function EditResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await prisma.surveyResponse.findUnique({ where: { id } })
  if (!response) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/responses" className="text-red-600 hover:text-red-800 text-sm font-medium">
          ← Back to Responses
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Edit Response</h1>
      </div>
      <EditResponseForm
        id={response.id}
        patientName={response.patientName}
        fatherName={response.fatherName}
        mrnNo={response.mrnNo}
        dateOfProcedure={response.dateOfProcedure.toISOString().slice(0, 10)}
        contactNumber={response.contactNumber}
        language={response.language}
        answers={response.answers as Record<string, unknown>}
      />
    </div>
  )
}
