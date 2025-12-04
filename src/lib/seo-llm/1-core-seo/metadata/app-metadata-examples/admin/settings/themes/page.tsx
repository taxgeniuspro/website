import { ThemeManager } from '@/components/admin/theme-manager'
import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ThemesPage() {
  const { user } = await validateRequest()

  if (!user || (user as any).role !== 'ADMIN') {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto py-6">
      <ThemeManager />
    </div>
  )
}
