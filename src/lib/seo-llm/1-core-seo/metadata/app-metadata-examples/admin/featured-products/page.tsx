import { redirect } from 'next/navigation'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import FeaturedProductsManager from '@/components/admin/featured-products-manager'

export default async function FeaturedProductsPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const featuredProducts = await prisma.featuredProductSelection.findMany({
    include: {
      Product: {
        include: {
          images: {
            take: 1,
            orderBy: { isPrimary: 'desc' },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      images: {
        take: 1,
        orderBy: { isPrimary: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Featured Products</h1>
        <p className="text-muted-foreground mt-2">
          Select and customize which products to feature on your homepage
        </p>
      </div>

      <FeaturedProductsManager
        featuredProducts={featuredProducts}
        allProducts={allProducts}
      />
    </div>
  )
}
