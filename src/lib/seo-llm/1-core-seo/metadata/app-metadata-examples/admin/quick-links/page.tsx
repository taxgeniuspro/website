import { redirect } from 'next/navigation'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QuickLinksManager from '@/components/admin/quick-links-manager'

export default async function QuickLinksPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const quickLinks = await prisma.quickLink.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
    },
    take: 100,
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quick Links Manager</h1>
        <p className="text-muted-foreground mt-2">
          Manage the quick access links that appear in your header navigation bar
        </p>
      </div>

      <QuickLinksManager
        quickLinks={quickLinks}
        categories={categories}
        products={products}
      />
    </div>
  )
}
