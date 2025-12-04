import { redirect } from 'next/navigation'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import MenuBuilderClient from '@/components/admin/menu-builder-client'

export default async function MenuEditPage({ params }: { params: { id: string } }) {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      items: {
        where: { parentId: null },
        orderBy: { sortOrder: 'asc' },
        include: {
          Children: {
            orderBy: { sortOrder: 'asc' },
            include: {
              Children: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })

  if (!menu) {
    notFound()
  }

  // Fetch categories and products for the item picker
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
    take: 100, // Limit to first 100 for performance
  })

  return (
    <MenuBuilderClient
      menu={menu}
      categories={categories}
      products={products}
    />
  )
}
