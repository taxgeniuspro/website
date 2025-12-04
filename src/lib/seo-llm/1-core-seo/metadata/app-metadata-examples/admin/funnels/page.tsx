import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FunnelsTable } from '@/components/funnels/funnels-table'
import { CreateFunnelButton } from '@/components/funnels/create-funnel-button'
import { FunnelStats } from '@/components/funnels/funnel-stats'

export default async function FunnelsPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch funnels with stats
  const funnels = await prisma.funnel.findMany({
    where: { userId: user.id },
    include: {
      FunnelStep: {
        orderBy: { position: 'asc' },
      },
      _count: {
        select: {
          FunnelStep: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate aggregate stats
  const stats = {
    totalFunnels: funnels.length,
    activeFunnels: funnels.filter((f) => f.status === 'ACTIVE').length,
    totalViews: funnels.reduce((sum, f) => sum + f.totalViews, 0),
    totalRevenue: funnels.reduce((sum, f) => sum + f.totalRevenue, 0),
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Funnels</h1>
          <p className="text-muted-foreground mt-1">
            Manage your sales funnels and conversion paths
          </p>
        </div>
        <CreateFunnelButton />
      </div>

      <FunnelStats stats={stats} />

      <div className="mt-8">
        <FunnelsTable funnels={funnels} />
      </div>
    </div>
  )
}
