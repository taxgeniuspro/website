/**
 * SEO Brain Telegram Notifier
 *
 * Sends intelligent alerts and decision requests to admin via Telegram
 * Bot: Micheal (SEO LLM Landing Page Master)
 */

const TELEGRAM_BOT_TOKEN =
  process.env.SEO_BRAIN_TELEGRAM_BOT_TOKEN || '7510262123:AAFiInboeGKrhovu8hcmDvZsDgEpS3W1yWs'
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID // You'll need to add this

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export interface TelegramAlert {
  type: 'opportunity' | 'issue' | 'decision' | 'winner' | 'loser' | 'complete'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  details?: Record<string, any>
  options?: DecisionOption[]
  entityType?: string
  entityId?: string
}

export interface DecisionOption {
  option: string // "A", "B", "C"
  action: string
  pros: string[]
  cons: string[]
  confidence: number // 1-100
  estimatedImpact?: string
}

/**
 * Send alert to Telegram
 */
export async function sendTelegramAlert(
  alert: TelegramAlert
): Promise<{ success: boolean; messageId?: string }> {
  try {
    if (!TELEGRAM_CHAT_ID) {
      console.warn('[Telegram] TELEGRAM_ADMIN_CHAT_ID not configured')
      return { success: false }
    }

    // Format message with emoji and structure
    const formattedMessage = formatAlertMessage(alert)

    // Send to Telegram
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formattedMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return {
        success: true,
        messageId: data.result.message_id,
      }
    } else {
      console.error('[Telegram] Send failed:', data)
      return { success: false }
    }
  } catch (error) {
    console.error('[Telegram] Error sending alert:', error)
    return { success: false }
  }
}

/**
 * Format alert message for Telegram (Markdown)
 */
function formatAlertMessage(alert: TelegramAlert): string {
  const emoji = getSeverityEmoji(alert.severity)
  const typeEmoji = getTypeEmoji(alert.type)

  let message = `${emoji} *${alert.title}*\n\n`
  message += `${typeEmoji} Type: ${alert.type.toUpperCase()}\n`
  message += `${alert.message}\n\n`

  // Add details if present
  if (alert.details) {
    message += `📊 *Details:*\n`
    for (const [key, value] of Object.entries(alert.details)) {
      message += `• ${formatKey(key)}: ${formatValue(value)}\n`
    }
    message += `\n`
  }

  // Add decision options if present
  if (alert.options && alert.options.length > 0) {
    message += `🤔 *Your Options:*\n\n`

    for (const opt of alert.options) {
      message += `*Option ${opt.option}:* ${opt.action}\n`
      message += `✅ Pros: ${opt.pros.join(', ')}\n`
      message += `❌ Cons: ${opt.cons.join(', ')}\n`
      message += `🎯 Confidence: ${opt.confidence}%\n`

      if (opt.estimatedImpact) {
        message += `📈 Impact: ${opt.estimatedImpact}\n`
      }

      message += `\n`
    }

    message += `*Reply with: A, B, or C to choose*\n`
  }

  // Add timestamp
  message += `\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`

  return message
}

/**
 * Get emoji for severity
 */
function getSeverityEmoji(severity: string): string {
  const emojiMap: Record<string, string> = {
    info: 'ℹ️',
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  }
  return emojiMap[severity] || 'ℹ️'
}

/**
 * Get emoji for alert type
 */
function getTypeEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    opportunity: '💎',
    issue: '⚠️',
    decision: '🤔',
    winner: '🏆',
    loser: '📉',
    complete: '✅',
  }
  return emojiMap[type] || '📢'
}

/**
 * Format key for display
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

/**
 * Format value for display
 */
function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Send opportunity alert
 */
export async function sendOpportunityAlert(params: {
  city: string
  product: string
  opportunity: string
  estimatedRevenue: number
  confidence: number
}) {
  return sendTelegramAlert({
    type: 'opportunity',
    severity: 'medium',
    title: `💎 New Opportunity: ${params.city}`,
    message: `${params.opportunity}`,
    details: {
      product: params.product,
      city: params.city,
      estimatedRevenue: `$${params.estimatedRevenue}`,
      confidence: `${params.confidence}%`,
    },
  })
}

/**
 * Send issue alert
 */
export async function sendIssueAlert(params: {
  city: string
  product: string
  issue: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentMetrics: Record<string, any>
}) {
  return sendTelegramAlert({
    type: 'issue',
    severity: params.severity,
    title: `⚠️ Issue Detected: ${params.city}`,
    message: `${params.issue}`,
    details: {
      product: params.product,
      city: params.city,
      ...params.currentMetrics,
    },
  })
}

/**
 * Send decision request
 */
export async function sendDecisionRequest(params: {
  title: string
  description: string
  context: Record<string, any>
  options: DecisionOption[]
  entityType?: string
  entityId?: string
}) {
  return sendTelegramAlert({
    type: 'decision',
    severity: 'high',
    title: params.title,
    message: params.description,
    details: params.context,
    options: params.options,
    entityType: params.entityType,
    entityId: params.entityId,
  })
}

/**
 * Send winner found alert
 */
export async function sendWinnerAlert(params: {
  city: string
  product: string
  metrics: Record<string, any>
  vsAverage: Record<string, any>
}) {
  return sendTelegramAlert({
    type: 'winner',
    severity: 'info',
    title: `🏆 Top Performer: ${params.city}`,
    message: `This city is crushing it! Should we replicate this success?`,
    details: {
      product: params.product,
      ...params.metrics,
      vsAverage: JSON.stringify(params.vsAverage),
    },
  })
}

/**
 * Send loser found alert with improvement options
 */
export async function sendLoserAlert(params: {
  city: string
  product: string
  metrics: Record<string, any>
  improvementOptions: DecisionOption[]
}) {
  return sendTelegramAlert({
    type: 'loser',
    severity: 'medium',
    title: `📉 Underperformer: ${params.city}`,
    message: `This city needs help. Here are your options:`,
    details: {
      product: params.product,
      ...params.metrics,
    },
    options: params.improvementOptions,
  })
}

/**
 * Send campaign complete alert
 */
export async function sendCampaignCompleteAlert(params: {
  product: string
  citiesGenerated: number
  totalRevenue: number
  topCities: string[]
  metrics: Record<string, any>
}) {
  return sendTelegramAlert({
    type: 'complete',
    severity: 'info',
    title: `✅ Campaign Complete: ${params.product}`,
    message: `Your 200-city campaign is done and optimized!`,
    details: {
      citiesGenerated: params.citiesGenerated,
      totalRevenue: `$${params.totalRevenue}`,
      topCities: params.topCities.join(', '),
      ...params.metrics,
    },
  })
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(): Promise<{
  success: boolean
  chatId?: string
  error?: string
}> {
  try {
    if (!TELEGRAM_CHAT_ID) {
      return {
        success: false,
        error: 'TELEGRAM_ADMIN_CHAT_ID not configured. Add to .env file.',
      }
    }

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '🤖 *SEO Brain Connected!*\n\nYour SEO Brain is online and ready to help optimize your 200-city landing pages.\n\nYou will receive alerts about:\n• New opportunities\n• Performance issues\n• Winner/loser pages\n• Decisions that need your input',
        parse_mode: 'Markdown',
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return {
        success: true,
        chatId: TELEGRAM_CHAT_ID,
      }
    } else {
      return {
        success: false,
        error: data.description || 'Unknown error',
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}
