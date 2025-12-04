/**
 * Crawler Activity Page
 *
 * Standalone page for tracking bot crawl activity
 * Accessible from Admin → Analytics → Crawler Activity
 */

import { CrawlerActivityDashboard } from '@/components/admin/seo/CrawlerActivityDashboard'
import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Crawler Activity | Admin Dashboard',
  description: 'Track which search engines and AI bots are crawling your site',
}

export default async function CrawlerActivityPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Crawler Activity</h1>
        <p className="text-gray-600">
          Monitor which search engines and AI bots are discovering and indexing your site
        </p>
      </div>

      <CrawlerActivityDashboard />
    </div>
  )
}
