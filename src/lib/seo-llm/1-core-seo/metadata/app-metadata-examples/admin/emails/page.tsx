/**
 * Email Templates Preview Page
 *
 * Admin page to preview all transactional email templates
 */

import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EmailPreviewClient from './email-preview-client'

export const metadata = {
  title: 'Email Templates | Admin',
  description: 'Preview all transactional email templates',
}

export default async function EmailPreviewPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return <EmailPreviewClient />
}
