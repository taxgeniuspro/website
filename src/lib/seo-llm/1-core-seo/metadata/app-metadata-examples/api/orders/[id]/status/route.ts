/**
 * Order Status Update API
 *
 * Allows admins to update order status with validation
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { OrderService } from '@/lib/services/order-service'
import { prisma } from '@/lib/prisma'
import { type OrderStatus } from '@prisma/client'

interface StatusUpdateRequest {
  toStatus: OrderStatus
  notes?: string
  metadata?: Record<string, unknown>
}

/**
 * PATCH /api/orders/[id]/status
 *
 * Update order status with validation
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await validateRequest()

    // Only admins can update status
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: StatusUpdateRequest = await request.json()
    const { toStatus, notes, metadata } = body

    if (!toStatus) {
      return NextResponse.json({ error: 'toStatus is required' }, { status: 400 })
    }

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ADMIN OVERRIDE: Admins can change to any status (no transition validation)
    // This allows quick status updates without being restricted by workflow rules

    // Update status via service
    await OrderService.updateStatus({
      orderId: id,
      fromStatus: order.status,
      toStatus,
      notes,
      changedBy: user.email || 'Admin',
      metadata,
    })

    // Update landing page metrics if order came from a landing page
    // Only update when order is confirmed (payment successful)
    if (toStatus === 'CONFIRMATION' && order.sourceLandingPageId) {
      try {
        await prisma.cityLandingPage.update({
          where: { id: order.sourceLandingPageId },
          data: {
            orders: { increment: 1 },
            revenue: { increment: order.total },
          },
        })

        // Recalculate conversion rate
        const landingPage = await prisma.cityLandingPage.findUnique({
          where: { id: order.sourceLandingPageId },
          select: { organicViews: true, orders: true },
        })

        if (landingPage && landingPage.organicViews > 0) {
          const conversionRate = (landingPage.orders / landingPage.organicViews) * 100
          await prisma.cityLandingPage.update({
            where: { id: order.sourceLandingPageId },
            data: { conversionRate },
          })
        }
      } catch (metricsError) {
        // Don't fail status update if metrics update fails
        console.error('[Landing Page Metrics] Failed to update:', metricsError)
      }
    }

    // Return updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        StatusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    console.error('[Status Update] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Status update failed'

    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

/**
 * GET /api/orders/[id]/status
 *
 * Get order status history with valid next states from database
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        paidAt: true,
        StatusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ADMIN OVERRIDE: Return ALL active statuses for quick status changes
    // Get all active statuses instead of just valid transitions
    const allStatuses = await prisma.customOrderStatus.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        badgeColor: true,
        isPaid: true,
      },
    })

    // Get current status details
    const currentStatusDetails = await prisma.customOrderStatus.findUnique({
      where: { slug: order.status },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        badgeColor: true,
        isPaid: true,
      },
    })

    // Convert all statuses to validNextStates format (exclude current status)
    const validNextStates = allStatuses
      .filter((s) => s.slug !== order.status)
      .map((s) => ({
        ...s,
        requiresPayment: false,
        requiresAdmin: false,
      }))

    return NextResponse.json({
      currentStatus: order.status,
      currentStatusDetails,
      history: order.StatusHistory,
      validNextStates,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}

/**
 * Validate if a status transition is allowed (ORDER STATUS MANAGER)
 */
async function validateStatusTransition(
  fromStatusSlug: string,
  toStatusSlug: string
): Promise<boolean> {
  // Allow same-status transitions
  if (fromStatusSlug === toStatusSlug) return true

  try {
    // Look up both statuses by slug
    const [fromStatus, toStatus] = await Promise.all([
      prisma.customOrderStatus.findUnique({ where: { slug: fromStatusSlug } }),
      prisma.customOrderStatus.findUnique({ where: { slug: toStatusSlug } }),
    ])

    if (!fromStatus || !toStatus) {
      console.error('[Status Validation] Status not found:', { fromStatusSlug, toStatusSlug })
      return false
    }

    // Check if transition exists in database
    const transition = await prisma.statusTransition.findUnique({
      where: {
        fromStatusId_toStatusId: {
          fromStatusId: fromStatus.id,
          toStatusId: toStatus.id,
        },
      },
    })

    return !!transition
  } catch (error) {
    console.error('[Status Validation] Error validating transition:', error)
    return false
  }
}

/**
 * Get valid next states from database (ORDER STATUS MANAGER)
 */
async function getValidNextStatesFromDb(currentStatusSlug: string) {
  try {
    // Get current status
    const currentStatus = await prisma.customOrderStatus.findUnique({
      where: { slug: currentStatusSlug },
    })

    if (!currentStatus) {
      return []
    }

    // Get valid transitions
    const transitions = await prisma.statusTransition.findMany({
      where: {
        fromStatusId: currentStatus.id,
      },
      include: {
        ToStatus: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            badgeColor: true,
            isPaid: true,
          },
        },
      },
    })

    return transitions.map((t) => ({
      ...t.ToStatus,
      requiresPayment: t.requiresPayment,
      requiresAdmin: t.requiresAdmin,
    }))
  } catch (error) {
    console.error('[Status API] Failed to get valid next states:', error)
    return []
  }
}
