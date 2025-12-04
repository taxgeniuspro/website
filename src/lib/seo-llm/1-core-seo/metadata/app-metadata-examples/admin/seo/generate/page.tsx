import { type Metadata } from 'next'
import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SEOGenerationDashboard } from '@/components/admin/seo/SEOGenerationDashboard'

export const metadata: Metadata = {
  title: 'SEO Content Generation | Admin',
  description: 'Generate AI-powered SEO content for product pages',
}

export default async function SEOGeneratePage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO Content Generation</h1>
        <p className="text-muted-foreground mt-2">
          Generate AI-powered SEO content for product pages using Ollama (Qwen2.5:32b)
        </p>
      </div>

      <SEOGenerationDashboard />
    </div>
  )
}
