import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SEOBrainDashboard } from '@/components/admin/seo-brain-dashboard'

export default async function SEOBrainPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOBrainDashboard />
    </div>
  )
}
