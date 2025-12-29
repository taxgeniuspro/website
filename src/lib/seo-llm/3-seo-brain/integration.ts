import { db, firstOrNull } from '@/lib/db'
import { SERVICE_ENDPOINTS } from '@/lib/constants'

// Local type definitions (replacing @prisma/client)
interface N8NWebhook {
  id: string
  name: string
  url: string
  trigger: string
  description?: string | null
  payload?: any
  isActive: boolean
  triggerCount: number
  lastTriggered?: string | null
  createdAt: string
  updatedAt: string
}

interface N8NWebhookLog {
  id: string
  webhookId: string
  payload: any
  response: any
  status: number
  executedAt: string
}

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
    const { data, error } = await db
      .from('n8n_webhooks')
      .insert({
        name,
        url: webhookUrl,
        trigger,
        description,
        payload,
        isActive: true,
        triggerCount: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data as N8NWebhook
  }

  static async getWebhooks(): Promise<N8NWebhook[]> {
    const { data } = await db
      .from('n8n_webhooks')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })

    return (data || []) as N8NWebhook[]
  }

  static async getWebhook(id: string): Promise<(N8NWebhook & { logs?: N8NWebhookLog[] }) | null> {
    const { data: webhookData } = await db
      .from('n8n_webhooks')
      .select('*')
      .eq('id', id)
      .limit(1)

    const webhook = firstOrNull(webhookData) as N8NWebhook | null
    if (!webhook) return null

    // Get logs separately
    const { data: logsData } = await db
      .from('n8n_webhook_logs')
      .select('*')
      .eq('webhookId', id)
      .order('executedAt', { ascending: false })
      .limit(10)

    return {
      ...webhook,
      logs: (logsData || []) as N8NWebhookLog[],
    }
  }

  static async updateWebhook(id: string, updateData: Partial<N8NWebhook>): Promise<N8NWebhook> {
    const { data, error } = await db
      .from('n8n_webhooks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as N8NWebhook
  }

  static async deleteWebhook(id: string): Promise<void> {
    await db
      .from('n8n_webhooks')
      .delete()
      .eq('id', id)
  }

  static async triggerWebhook(
    trigger: string,
    triggerData: Record<string, unknown>
  ): Promise<N8NExecutionResult[]> {
    const { data: webhooksData } = await db
      .from('n8n_webhooks')
      .select('*')
      .eq('trigger', trigger)
      .eq('isActive', true)

    const webhooks = (webhooksData || []) as N8NWebhook[]

    const results: N8NExecutionResult[] = []

    for (const webhook of webhooks) {
      try {
        const result = await this.executeWebhook(webhook, triggerData)
        results.push(result)

        // Log the execution
        await this.logWebhookExecution(webhook.id, triggerData, result)

        // Update trigger count - get current and increment
        await db
          .from('n8n_webhooks')
          .update({
            triggerCount: (webhook.triggerCount || 0) + 1,
            lastTriggered: new Date().toISOString(),
          })
          .eq('id', webhook.id)
      } catch (error) {
        const errorResult: N8NExecutionResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        results.push(errorResult)

        // Log the error
        await this.logWebhookExecution(webhook.id, triggerData, errorResult, 500)
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
    await db
      .from('n8n_webhook_logs')
      .insert({
        webhookId,
        payload,
        response,
        status,
        executedAt: new Date().toISOString(),
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
    const { data: webhookData } = await db
      .from('n8n_webhooks')
      .select('*')
      .eq('id', webhookId)
      .limit(1)

    const webhook = firstOrNull(webhookData) as N8NWebhook | null

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto')
    const computedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    )
  }
}

/**
 * SEO Brain - Main orchestrator for campaign analysis and optimization
 *
 * This object provides high-level methods for campaign management
 * and integrates with performance analysis, Telegram notifications, etc.
 */
export const seoBrain = {
  /**
   * Analyze a campaign's performance and generate optimization recommendations
   */
  async analyzeCampaign(campaignId: string): Promise<void> {
    console.log(`[SEO Brain] Starting analysis for campaign: ${campaignId}`)

    // Trigger webhook for campaign analysis
    await N8NIntegration.triggerWebhook('campaign_analysis', {
      campaignId,
      eventType: 'seo.campaign.analysis.started',
      timestamp: new Date().toISOString(),
    })

    console.log(`[SEO Brain] Analysis triggered for campaign: ${campaignId}`)
  },

  /**
   * Execute an approved decision for a campaign
   */
  async executeDecision(decisionId: string, selectedOption: string): Promise<void> {
    console.log(`[SEO Brain] Executing decision ${decisionId} with option ${selectedOption}`)

    // Trigger webhook for decision execution
    await N8NIntegration.triggerWebhook('decision_executed', {
      decisionId,
      selectedOption,
      eventType: 'seo.decision.executed',
      timestamp: new Date().toISOString(),
    })

    console.log(`[SEO Brain] Decision ${decisionId} executed with option ${selectedOption}`)
  },
}
