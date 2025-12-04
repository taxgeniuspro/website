import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AccountWrapper from '@/components/account/account-wrapper'
import { AddressManager } from '@/components/account/address-manager'

export default async function AddressesPage() {
  const { user } = await validateRequest()

  if (!user) {
    redirect('/auth/signin')
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <AccountWrapper>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Addresses</h1>
        <p className="text-muted-foreground mb-8">Manage your shipping and billing addresses</p>

        <AddressManager addresses={addresses} />
      </div>
    </AccountWrapper>
  )
}
