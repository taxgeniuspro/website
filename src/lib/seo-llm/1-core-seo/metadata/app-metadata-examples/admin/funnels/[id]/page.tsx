import { validateRequest } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FunnelEditor } from '@/components/funnels/funnel-editor'

interface FunnelEditorPageProps {
  params: {
    id: string
  }
}

export default async function FunnelEditorPage({ params }: FunnelEditorPageProps) {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch funnel with all related data
  const funnel = await prisma.funnel.findUnique({
    where: { id: params.id },
    include: {
      FunnelStep: {
        orderBy: { position: 'asc' },
        include: {
          FunnelStepProduct: {
            include: {
              Product: {
                include: {
                  ProductImage: true,
                  ProductCategory: true,
                },
              },
            },
          },
          OrderBump: {
            include: {
              Product: {
                include: {
                  ProductImage: true,
                },
              },
            },
          },
          Upsell: {
            include: {
              Product: {
                include: {
                  ProductImage: true,
                },
              },
            },
          },
          Downsell: {
            include: {
              Product: {
                include: {
                  ProductImage: true,
                },
              },
            },
          },
          PageVersion: {
            include: {
              PageElement: {
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!funnel) {
    notFound()
  }

  // Verify ownership
  if (funnel.userId !== user.id) {
    redirect('/admin/funnels')
  }

  // Fetch all products for selection
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      ProductImage: true,
      ProductCategory: true,
    },
    orderBy: { name: 'asc' },
  })

  return <FunnelEditor funnel={funnel} products={products} />
}
