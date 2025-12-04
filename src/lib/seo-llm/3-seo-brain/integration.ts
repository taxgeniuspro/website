import { prisma } from '@/lib/prisma'
import { SERVICE_ENDPOINTS } from '@/lib/constants'

export interface N8NWorkflowConfig {
  id: string
  name: string
  active: boolean
  webhooks: Array<{
    path: string
    method: string
    responseMode: string
  }>
}

export interface N8NWebhookPayload {
  trigger: string
  data: Record<string, unknown>
  timestamp: string
  source: 'gangrunprinting'
}

export interface N8NExecutionResult {
  success: boolean
  executionId?: string
  error?: string
  data?: Record<string, unknown>
}

export class N8NIntegration {
  private static readonly N8N_BASE_URL = SERVICE_ENDPOINTS.N8N_BASE
  private static readonly N8N_API_KEY = process.env.N8N_API_KEY
  private static readonly WEBHOOK_SECRET =
    process.env.N8N_WEBHOOK_SECRET || 'gangrun-webhook-secret'

  static async registerWebhook(
    name: string,
    trigger: string,
    description?: string,
    payload?: Record<string, unknown>
  ): Promise<N8NWebhook> {
    // Generate webhook URL
    const webhookPath = `webhook/gangrun/${trigger.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    const webhookUrl = `${this.N8N_BASE_URL}/${webhookPath}`

    // Create webhook in database
    return await prisma.n8NWebhook.create({
      data: {
        name,
        url: webhookUrl,
        trigger,
        description,
        payload,
        isActive: true,
      },
    })
  }

  static async getWebhooks(): Promise<N8NWebhook[]> {
    return await prisma.n8NWebhook.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getWebhook(id: string): Promise<N8NWebhook | null> {
    return await prisma.n8NWebhook.findUnique({
      where: { id },
      include: {
        logs: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
    })
  }

  static async updateWebhook(id: string, data: Partial<N8NWebhook>): Promise<N8NWebhook> {
    return await prisma.n8NWebhook.update({
      where: { id },
      data,
    })
  }

  static async deleteWebhook(id: string): Promise<void> {
    await prisma.n8NWebhook.delete({
      where: { id },
    })
  }

  static async triggerWebhook(
    trigger: string,
    data: Record<string, unknown>
  ): Promise<N8NExecutionResult[]> {
    const webhooks = await prisma.n8NWebhook.findMany({
      where: {
        trigger,
        isActive: true,
      },
    })

    const results: N8NExecutionResult[] = []

    for (const webhook of webhooks) {
      try {
        const result = await this.executeWebhook(webhook, data)
        results.push(result)

        // Log the execution
        await this.logWebhookExecution(webhook.id, data, result)

        // Update trigger count
        await prisma.n8NWebhook.update({
          where: { id: webhook.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggered: new Date(),
          },
        })
      } catch (error) {
        const errorResult: N8NExecutionResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        results.push(errorResult)

        // Log the error
        await this.logWebhookExecution(webhook.id, data, errorResult, 500)
      }
    }

    return results
  }

  private static async executeWebhook(
    webhook: N8NWebhook,
    data: Record<string, unknown>
  ): Promise<N8NExecutionResult> {
    const payload: N8NWebhookPayload = {
      trigger: webhook.trigger,
      data,
      timestamp: new Date().toISOString(),
      source: 'gangrunprinting',
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': this.WEBHOOK_SECRET,
        'User-Agent': 'GangRun-Printing/1.0',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`)
    }

    const responseData = await response.json()

    return {
      success: true,
      executionId: responseData.executionId,
      data: responseData,
    }
  }

  private static async logWebhookExecution(
    webhookId: string,
    payload: Record<string, unknown>,
    response: N8NExecutionResult,
    status: number = 200
  ): Promise<void> {
    await prisma.n8NWebhookLog.create({
      data: {
        webhookId,
        payload,
        response,
        status,
      },
    })
  }

  // Marketing-specific webhook triggers
  static async triggerCampaignSent(
    campaignId: string,
    campaignData: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('campaign_sent', {
      campaignId,
      campaign: campaignData,
      eventType: 'marketing.campaign.sent',
    })
  }

  static async triggerEmailOpened(
    campaignId: string,
    recipientEmail: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('email_opened', {
      campaignId,
      recipientEmail,
      metadata,
      eventType: 'marketing.email.opened',
    })
  }

  static async triggerEmailClicked(
    campaignId: string,
    recipientEmail: string,
    clickedUrl: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('email_clicked', {
      campaignId,
      recipientEmail,
      clickedUrl,
      metadata,
      eventType: 'marketing.email.clicked',
    })
  }

  static async triggerCustomerSegmentUpdated(
    segmentId: string,
    segmentData: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('segment_updated', {
      segmentId,
      segment: segmentData,
      eventType: 'marketing.segment.updated',
    })
  }

  static async triggerWorkflowCompleted(
    workflowId: string,
    executionId: string,
    userId: string,
    results: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('workflow_completed', {
      workflowId,
      executionId,
      userId,
      results,
      eventType: 'marketing.workflow.completed',
    })
  }

  static async triggerABTestCompleted(
    testId: string,
    winnerId: string,
    results: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('ab_test_completed', {
      testId,
      winnerId,
      results,
      eventType: 'marketing.ab_test.completed',
    })
  }

  // Business event triggers
  static async triggerOrderPlaced(
    orderId: string,
    orderData: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('order_placed', {
      orderId,
      order: orderData,
      eventType: 'business.order.placed',
    })
  }

  static async triggerUserRegistered(
    userId: string,
    userData: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('user_registered', {
      userId,
      user: userData,
      eventType: 'business.user.registered',
    })
  }

  static async triggerCartAbandoned(
    userId: string,
    cartData: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('cart_abandoned', {
      userId,
      cart: cartData,
      eventType: 'business.cart.abandoned',
    })
  }

  static async triggerCustomerReturned(
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.triggerWebhook('customer_returned', {
      userId,
      metadata,
      eventType: 'business.customer.returned',
    })
  }

  // N8N API integration methods
  static async getN8NWorkflows(): Promise<N8NWorkflowConfig[]> {
    if (!this.N8N_API_KEY) {
      throw new Error('N8N API key not configured')
    }

    try {
      const response = await fetch(`${this.N8N_BASE_URL}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.N8N_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`N8N API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      return []
    }
  }

  static async activateN8NWorkflow(workflowId: string): Promise<boolean> {
    if (!this.N8N_API_KEY) {
      throw new Error('N8N API key not configured')
    }

    try {
      const response = await fetch(`${this.N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': this.N8N_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  static async deactivateN8NWorkflow(workflowId: string): Promise<boolean> {
    if (!this.N8N_API_KEY) {
      throw new Error('N8N API key not configured')
    }

    try {
      const response = await fetch(
        `${this.N8N_BASE_URL}/api/v1/workflows/${workflowId}/deactivate`,
        {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': this.N8N_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.ok
    } catch (error) {
      return false
    }
  }

  static async getN8NExecutions(workflowId?: string): Promise<any[]> {
    if (!this.N8N_API_KEY) {
      throw new Error('N8N API key not configured')
    }

    try {
      let url = `${this.N8N_BASE_URL}/api/v1/executions`
      if (workflowId) {
        url += `?workflowId=${workflowId}`
      }

      const response = await fetch(url, {
        headers: {
          'X-N8N-API-KEY': this.N8N_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`N8N API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      return []
    }
  }

  // Webhook health check
  static async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = await prisma.n8NWebhook.findUnique({
      where: { id: webhookId },
    })

    if (!webhook) {
      throw new Error('Webhook not found')
    }

    try {
      const testPayload = {
        trigger: 'health_check',
        data: { test: true },
        timestamp: new Date().toISOString(),
        source: 'gangrunprinting',
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.WEBHOOK_SECRET,
          'User-Agent': 'GangRun-Printing/1.0',
        },
        body: JSON.stringify(testPayload),
      })

      const success = response.ok

      // Log the test
      await this.logWebhookExecution(
        webhookId,
        testPayload,
        { success, data: success ? await response.json() : null },
        response.status
      )

      return success
    } catch (error) {
      await this.logWebhookExecution(
        webhookId,
        { test: true },
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
      return false
    }
  }

  // Predefined webhook configurations
  static async createPredefinedWebhooks(): Promise<void> {
    const webhooks = [
      {
        name: 'Order Placed Automation',
        trigger: 'order_placed',
        description: 'Trigger automation workflows when a new order is placed',
      },
      {
        name: 'User Registration Welcome',
        trigger: 'user_registered',
        description: 'Send welcome series when a new user registers',
      },
      {
        name: 'Email Engagement Tracking',
        trigger: 'email_opened',
        description: 'Track email opens for engagement scoring',
      },
      {
        name: 'Cart Abandonment Recovery',
        trigger: 'cart_abandoned',
        description: 'Trigger cart abandonment recovery workflows',
      },
      {
        name: 'Campaign Performance Analytics',
        trigger: 'campaign_sent',
        description: 'Send campaign data to analytics platforms',
      },
      {
        name: 'Customer Segmentation Updates',
        trigger: 'segment_updated',
        description: 'Sync segment updates with external platforms',
      },
      {
        name: 'A/B Test Results',
        trigger: 'ab_test_completed',
        description: 'Notify team when A/B tests complete',
      },
      {
        name: 'Workflow Completion Tracking',
        trigger: 'workflow_completed',
        description: 'Track marketing workflow completion rates',
      },
    ]

    for (const webhookData of webhooks) {
      try {
        await this.registerWebhook(webhookData.name, webhookData.trigger, webhookData.description)
      } catch (error) {}
    }
  }

  // Utility method to verify webhook signatures
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string = this.WEBHOOK_SECRET
  ): boolean {
    const crypto = require('crypto')
    const computedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    )
  }
}
