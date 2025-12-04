import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AccountWrapper from '@/components/account/account-wrapper'
import { PaymentMethodManager } from '@/components/account/payment-method-manager'

export default async function PaymentMethodsPage() {
  const { user } = await validateRequest()

  if (!user) {
    redirect('/auth/signin')
  }

  const [paymentMethods, addresses] = await Promise.all([
    prisma.savedPaymentMethod.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        BillingAddress: true,
      },
    }),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return (
    <AccountWrapper>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
        <p className="text-muted-foreground mb-8">Manage your saved payment methods</p>

        <PaymentMethodManager paymentMethods={paymentMethods} addresses={addresses} />
      </div>
    </AccountWrapper>
  )
}
