import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/marketing/analytics
 * Returns real marketing campaign and workflow analytics
 */
export async function GET(request: Request) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30d'

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 30d
        startDate.setDate(now.getDate() - 30)
    }

    // Get campaign analytics from CampaignAnalytics and CampaignSend tables
    const campaigns = await prisma.marketingCampaign.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        CampaignAnalytics: true,
        CampaignSend: true,
      },
    })

    // Aggregate campaign metrics
    const totalCampaigns = campaigns.length
    const sentCampaigns = campaigns.filter((c) => c.sentAt !== null).length
    const activeCampaigns = campaigns.filter(
      (c) => c.status === 'SENDING' || c.status === 'SCHEDULED'
    ).length

    let totalSent = 0
    let totalDelivered = 0
    let totalOpened = 0
    let totalClicked = 0
    let totalRevenue = 0
    let totalOrders = 0

    campaigns.forEach((campaign) => {
      campaign.CampaignAnalytics.forEach((analytics) => {
        totalSent += analytics.sent
        totalDelivered += analytics.delivered
        totalOpened += analytics.opened
        totalClicked += analytics.clicked
        totalRevenue += analytics.revenue
        totalOrders += analytics.orders
      })
    })

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0

    // Get workflow data
    const workflows = await prisma.marketingWorkflow.findMany({
      include: {
        WorkflowExecution: {
          where: {
            createdAt: { gte: startDate },
          },
        },
      },
    })

    const totalWorkflows = workflows.length
    const activeWorkflows = workflows.filter((w) => w.isActive).length
    const totalExecutions = workflows.reduce((sum, w) => sum + w.WorkflowExecution.length, 0)
    const completedExecutions = workflows.reduce(
      (sum, w) => sum + w.WorkflowExecution.filter((e) => e.status === 'COMPLETED').length,
      0
    )
    const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0

    // Get segment data
    const segments = await prisma.customerSegment.findMany({
      where: { isActive: true },
    })
    const totalSegments = segments.length
    const totalCustomersInSegments = segments.reduce((sum, s) => sum + s.count, 0)

    // Calculate performance metrics from orders
    const marketingOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
    })

    const performanceRevenue = marketingOrders.reduce((sum, o) => sum + o.total, 0) / 100
    const performanceOrders = marketingOrders.length
    const avgOrderValue = performanceOrders > 0 ? performanceRevenue / performanceOrders : 0
    const conversionRate = totalSent > 0 ? (performanceOrders / totalSent) * 100 : 0

    return NextResponse.json({
      campaigns: {
        total: totalCampaigns,
        sent: sentCampaigns,
        active: activeCampaigns,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
      },
      workflows: {
        total: totalWorkflows,
        active: activeWorkflows,
        executions: totalExecutions,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      segments: {
        total: totalSegments,
        customers: totalCustomersInSegments,
      },
      performance: {
        revenue: performanceRevenue,
        orders: performanceOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
    })
  } catch (error) {
    console.error('[GET /api/marketing/analytics] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch marketing analytics' }, { status: 500 })
  }
}
