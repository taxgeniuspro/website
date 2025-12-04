import { type NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { sendEmail } from '@/lib/resend'

// Import email templates (will create these in Phase 3)
import { AbandonedCartEmail } from '@/lib/email/templates/marketing/abandoned-cart'
import { WinbackEmail } from '@/lib/email/templates/marketing/winback'
import { AnniversaryEmail } from '@/lib/email/templates/marketing/anniversary'
import { ReviewRequestEmail } from '@/lib/email/templates/marketing/review-request'
import { ThankYouEmail } from '@/lib/email/templates/marketing/thank-you'

/**
 * POST /api/marketing/emails/render
 *
 * Render React Email template and send via Resend
 * Called by N8N workflows
 *
 * Request body:
 * {
 *   template: "abandoned_cart" | "winback" | "anniversary" | "review_request" | "thank_you"
 *   to: string (email address)
 *   subject: string
 *   data: object (template-specific data)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { template, to, subject, data } = body

    // Validate required fields
    if (!template || !to || !subject || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: template, to, subject, data' },
        { status: 400 }
      )
    }

    let emailHtml: string

    // Render appropriate template
    switch (template) {
      case 'abandoned_cart':
        emailHtml = render(AbandonedCartEmail(data))
        break

      case 'winback':
        emailHtml = render(WinbackEmail(data))
        break

      case 'anniversary':
        emailHtml = render(AnniversaryEmail(data))
        break

      case 'review_request':
        emailHtml = render(ReviewRequestEmail(data))
        break

      case 'thank_you':
        emailHtml = render(ThankYouEmail(data))
        break

      default:
        return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 })
    }

    // Send email via Resend
    await sendEmail({
      to,
      from: 'GangRun Printing <orders@gangrunprinting.com>',
      subject,
      html: emailHtml,
    })

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
      template,
    })
  } catch (error) {
    console.error('[API] Email render error:', error)
    return NextResponse.json({ error: 'Failed to render and send email' }, { status: 500 })
  }
}
