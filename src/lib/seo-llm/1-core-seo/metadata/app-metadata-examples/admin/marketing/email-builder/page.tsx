'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EmailBuilder, type EmailTemplate } from '@/components/marketing/email-builder'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Campaign {
  id: string
  name: string
  subject: string
  previewText: string
  content: Record<string, unknown>
  status: string
}

function EmailBuilderPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const campaignId = searchParams.get('campaignId')
  const templateId = searchParams.get('templateId')

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
    } else if (templateId) {
      fetchTemplate()
    } else {
      // Initialize blank template for new email
      setTemplate({
        id: '',
        name: 'New Email Template',
        subject: '',
        previewText: '',
        components: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          lineHeight: '1.5',
          textColor: '#333333',
        },
      })
      setLoading(false)
    }
  }, [campaignId, templateId])

  const fetchCampaign = async () => {
    if (!campaignId) return

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`)
      if (response.ok) {
        const data = await response.json()
        setCampaign(data)

        // Convert campaign to template format
        setTemplate({
          id: data.id,
          name: data.name,
          subject: data.subject || '',
          previewText: data.previewText || '',
          components: data.content?.components || [],
          globalStyles: data.content?.globalStyles || {
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
            textColor: '#333333',
          },
        })
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplate = async () => {
    if (!templateId) return

    try {
      const response = await fetch(`/api/marketing/templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate({
          id: data.id,
          name: data.name,
          subject: data.subject,
          previewText: data.previewText || '',
          components: data.content?.components || [],
          globalStyles: data.content?.globalStyles || {
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
            textColor: '#333333',
          },
        })
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (emailTemplate: EmailTemplate) => {
    setSaving(true)

    try {
      if (campaignId) {
        // Update campaign content
        const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: emailTemplate.subject,
            previewText: emailTemplate.previewText,
            content: {
              components: emailTemplate.components,
              globalStyles: emailTemplate.globalStyles,
            },
          }),
        })

        if (response.ok) {
          const updatedCampaign = await response.json()
          setCampaign(updatedCampaign)
        }
      } else if (templateId) {
        // Update template
        const response = await fetch(`/api/marketing/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: emailTemplate.name,
            subject: emailTemplate.subject,
            previewText: emailTemplate.previewText,
            content: {
              components: emailTemplate.components,
              globalStyles: emailTemplate.globalStyles,
            },
          }),
        })

        if (response.ok) {
          // Template updated successfully
        }
      } else {
        // Save as new template
        const response = await fetch('/api/marketing/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: emailTemplate.name,
            category: 'custom',
            subject: emailTemplate.subject,
            previewText: emailTemplate.previewText,
            content: {
              components: emailTemplate.components,
              globalStyles: emailTemplate.globalStyles,
            },
            isPublic: false,
          }),
        })

        if (response.ok) {
          const newTemplate = await response.json()
          setTemplate((prev) => ({ ...prev!, id: newTemplate.id }))
        }
      }
    } catch (error) {
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = (emailTemplate: EmailTemplate) => {
    // Generate HTML preview
    const html = generateEmailHtml(emailTemplate)
    setPreviewHtml(html)
    setShowPreview(true)
  }

  const generateEmailHtml = (emailTemplate: EmailTemplate): string => {
    const { components, globalStyles } = emailTemplate

    const componentsHtml = components
      .map((component) => {
        switch (component.type) {
          case 'text':
            return `<div style="${Object.entries(component.styles)
              .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
              .join('; ')}">${component.content.text}</div>`

          case 'image':
            return `<div style="text-align: ${component.styles.textAlign}">
            <img src="${component.content.src}" alt="${component.content.alt}" style="width: ${component.content.width}; max-width: 100%; height: auto;" />
          </div>`

          case 'button':
            return `<div style="text-align: ${component.styles.textAlign}">
            <a href="${component.content.url}" style="${Object.entries(component.styles)
              .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
              .join('; ')}; text-decoration: none; display: inline-block;">
              ${component.content.text}
            </a>
          </div>`

          case 'divider':
            return `<div style="${Object.entries(component.styles)
              .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
              .join('; ')}"></div>`

          case 'columns':
            const columnWidth = 100 / component.content.columns
            return `<table style="width: 100%; border-collapse: collapse;">
            <tr>
              ${Array.from(
                { length: component.content.columns },
                (_, i) =>
                  `<td style="width: ${columnWidth}%; vertical-align: top; padding: 0 ${component.styles.gap ? parseInt(component.styles.gap) / 2 : 10}px;">
                  Column ${i + 1}
                </td>`
              ).join('')}
            </tr>
          </table>`

          default:
            return ''
        }
      })
      .join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailTemplate.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily}; font-size: ${globalStyles.fontSize}; line-height: ${globalStyles.lineHeight}; color: ${globalStyles.textColor};">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          ${componentsHtml}
        </div>
      </body>
      </html>
    `
  }

  const camelToKebab = (str: string): string => {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
  }

  const handleSendCampaign = async () => {
    if (!campaignId) return

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/admin/marketing/campaigns')
      }
    } catch (error) {}
  }

  if (loading) {
    return <div className="p-6">Loading email builder...</div>
  }

  console.log('EmailBuilderPage - template:', template)
  console.log('EmailBuilderPage - rendering')

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-xl font-semibold">
              {campaignId
                ? 'Edit Campaign'
                : templateId
                  ? 'Edit Template'
                  : 'Create Email Template'}
            </h1>
            {campaign && <p className="text-sm text-gray-600">{campaign.name}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {campaignId && campaign?.status === 'DRAFT' && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSendCampaign}>
              <Send className="w-4 h-4 mr-2" />
              Send Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Email Builder */}
      <div className="flex-1">
        <EmailBuilder template={template} onPreview={handlePreview} onSave={handleSave} />
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>This is how your email will appear to recipients</DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg overflow-hidden">
            <iframe className="w-full h-96" srcDoc={previewHtml} title="Email Preview" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EmailBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-center">Loading email builder...</div>
        </div>
      }
    >
      <EmailBuilderPageContent />
    </Suspense>
  )
}
