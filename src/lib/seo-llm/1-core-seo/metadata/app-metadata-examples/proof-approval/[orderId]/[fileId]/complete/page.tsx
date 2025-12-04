import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, ArrowRight, Mail, Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    orderId: string
    fileId: string
  }>
  searchParams: Promise<{
    status?: 'approved' | 'rejected'
  }>
}

async function getCompletionData(orderId: string, fileId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        User: {
          select: { name: true },
        },
      },
    })

    if (!order) {
      return null
    }

    const file = await prisma.orderFile.findUnique({
      where: {
        id: fileId,
        orderId: orderId,
      },
    })

    if (!file) {
      return null
    }

    // Check if all proofs for this order are approved
    const totalProofs = await prisma.orderFile.count({
      where: {
        orderId,
        fileType: 'ADMIN_PROOF',
      },
    })

    const approvedProofs = await prisma.orderFile.count({
      where: {
        orderId,
        fileType: 'ADMIN_PROOF',
        approvalStatus: 'APPROVED',
      },
    })

    const allProofsApproved = totalProofs > 0 && approvedProofs === totalProofs

    return {
      order,
      file,
      allProofsApproved,
      totalProofs,
      approvedProofs,
    }
  } catch (error) {
    console.error('Error fetching completion data:', error)
    return null
  }
}

export default async function ProofApprovalCompletePage({ params, searchParams }: PageProps) {
  const { orderId, fileId } = await params
  const { status } = await searchParams

  const data = await getCompletionData(orderId, fileId)

  if (!data) {
    notFound()
  }

  const { order, file, allProofsApproved, totalProofs, approvedProofs } = data
  const isApproved = file.approvalStatus === 'APPROVED'
  const isRejected = file.approvalStatus === 'REJECTED'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success/Action Confirmation */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isApproved ? (
                <CheckCircle className="h-16 w-16 text-green-600" />
              ) : (
                <XCircle className="h-16 w-16 text-orange-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isApproved ? 'Proof Approved!' : 'Changes Requested'}
            </CardTitle>
            <CardDescription className="text-base">
              Order #{order.orderNumber} • {order.User?.name || 'Customer'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <Badge
                className={`px-4 py-2 text-sm font-medium ${
                  isApproved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}
              >
                {isApproved ? '✅ Approved' : '🔄 Changes Requested'}
              </Badge>
            </div>

            <p className="text-gray-600">
              {isApproved
                ? "Thank you for approving the proof. We'll begin production right away!"
                : "We've received your change request and will create a revised proof for you."}
            </p>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isApproved ? (
              <div className="space-y-4">
                {allProofsApproved ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                        <CheckCircle className="h-5 w-5" />
                        All Proofs Approved - Production Starting!
                      </div>
                      <p className="text-green-700 text-sm">
                        All {totalProofs} proof{totalProofs !== 1 ? 's' : ''} for this order have
                        been approved. Your order is now ready for production.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        Your order will move to production queue immediately
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        We'll send you tracking information once your order ships
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        Estimated production time: 2-5 business days
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                        <Clock className="h-5 w-5" />
                        Waiting for Additional Approvals
                      </div>
                      <p className="text-blue-700 text-sm">
                        {approvedProofs} of {totalProofs} proof{totalProofs !== 1 ? 's' : ''}{' '}
                        approved. Production will begin once all proofs are approved.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        We're waiting for approval on remaining proof files
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        You'll receive an email when all proofs are ready
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        Production will begin automatically once complete
                      </li>
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-800 font-medium mb-2">
                    <MessageSquare className="h-5 w-5" />
                    Revision in Progress
                  </div>
                  <p className="text-orange-700 text-sm">
                    Our design team has been notified of your requested changes and will create a
                    revised proof.
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    Our team will review your feedback and make the requested changes
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    You'll receive a new proof via email within 1-2 business days
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    Production will begin once you approve the revised proof
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Our team is here to help with any questions about your order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-3 px-4" asChild>
                <a href="mailto:orders@gangrunprinting.com">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Email Support</div>
                      <div className="text-xs text-muted-foreground">
                        orders@gangrunprinting.com
                      </div>
                    </div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="h-auto py-3 px-4" asChild>
                <a href="tel:1-800-PRINTING">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Phone Support</div>
                      <div className="text-xs text-muted-foreground">1-800-PRINTING</div>
                    </div>
                  </div>
                </a>
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Button asChild>
                <Link href={`/track/${order.orderNumber}`}>Track Your Order</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Generate metadata
export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  return {
    title: `Proof Response Received - Order ${order?.orderNumber || orderId} | GangRun Printing`,
    description: "Thank you for your proof response. We'll process your feedback right away.",
    robots: 'noindex, nofollow',
  }
}
