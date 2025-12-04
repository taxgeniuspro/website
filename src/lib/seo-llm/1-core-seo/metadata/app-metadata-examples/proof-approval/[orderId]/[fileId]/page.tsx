import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProofApprovalInterface } from '@/components/customer/proof-approval-interface'

interface PageProps {
  params: Promise<{
    orderId: string
    fileId: string
  }>
  searchParams: Promise<{
    action?: 'approve' | 'reject'
    token?: string
  }>
}

async function getProofData(orderId: string, fileId: string) {
  try {
    // Get the order and file data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        User: {
          select: { name: true, email: true },
        },
      },
    })

    if (!order) {
      return null
    }

    const file = await prisma.orderFile.findUnique({
      where: {
        id: fileId,
        orderId: orderId, // Ensure file belongs to this order
      },
      include: {
        FileMessage: {
          where: { isInternal: false }, // Only show customer-facing messages
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!file) {
      return null
    }

    // Only allow approval for admin proofs that are waiting
    if (file.fileType !== 'ADMIN_PROOF' || file.approvalStatus !== 'WAITING') {
      return null
    }

    return {
      order,
      file,
    }
  } catch (error) {
    console.error('Error fetching proof data:', error)
    return null
  }
}

export default async function ProofApprovalPage({ params, searchParams }: PageProps) {
  const { orderId, fileId } = await params
  const { action } = await searchParams

  const proofData = await getProofData(orderId, fileId)

  if (!proofData) {
    notFound()
  }

  const { order, file } = proofData

  // If the file has already been approved or rejected, redirect to completion page
  if (file.approvalStatus !== 'WAITING') {
    redirect(`/proof-approval/${orderId}/${fileId}/complete?status=${file.approvalStatus}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proof Approval Required</h1>
              <p className="text-gray-600 mt-1">
                Order #{order.orderNumber} • {order.User?.name || 'Customer'}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                📄 Awaiting Your Approval
              </div>
            </div>
          </div>
        </div>

        {/* Proof Approval Interface */}
        <ProofApprovalInterface
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            customerName: order.User?.name || undefined,
          }}
          file={{
            id: file.id,
            filename: file.filename,
            label: file.label || undefined,
            fileUrl: file.fileUrl,
            thumbnailUrl: file.thumbnailUrl || undefined,
            mimeType: file.mimeType || undefined,
            fileSize: file.fileSize || undefined,
            approvalStatus: file.approvalStatus,
            createdAt: file.createdAt,
            messages: file.FileMessage.map((msg) => ({
              id: msg.id,
              message: msg.message,
              authorName: msg.authorName,
              authorRole: msg.authorRole,
              createdAt: msg.createdAt,
            })),
          }}
          defaultAction={action}
        />
      </div>
    </div>
  )
}

// Generate metadata for better SEO and social sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string; fileId: string }>
}) {
  const { orderId } = await params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  return {
    title: `Proof Approval - Order ${order?.orderNumber || orderId} | GangRun Printing`,
    description: 'Review and approve your proof before we begin production.',
    robots: 'noindex, nofollow', // Private customer pages shouldn't be indexed
  }
}
