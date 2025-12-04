import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ClearCartClient } from './_components/ClearCartClient';
import { logger } from '@/lib/logger';

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

async function OrderDetails({ sessionId }: { sessionId: string }) {
  // Check if this is a test order
  const isTestMode = sessionId.startsWith('test_session_');

  logger.info(`📦 Fetching order for session: ${sessionId} (test mode: ${isTestMode})`);

  try {
    // Fetch order from database by stripeSessionId
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!order) {
      logger.info('⏳ Order not found yet - webhook may be processing');

      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
              Processing Your Order
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Your payment was successful! We&apos;re creating your order now...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-700">
              This usually takes just a few seconds. Your order confirmation will appear shortly.
            </p>
            <div className="text-xs text-yellow-600">Session ID: {sessionId}</div>
          </CardContent>
        </Card>
      );
    }

    // Order found - display confirmation
    const items = order.items as Array<{ name: string; quantity: number; price: number }>;

    return (
      <>
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              Order Confirmed!
            </CardTitle>
            <CardDescription className="text-green-700">
              {isTestMode
                ? 'Test order created successfully (no payment processed)'
                : 'Your payment was successful and your order is being processed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Order ID:</span>{' '}
                <span className="font-mono text-xs">{order.id}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Total:</span> ${order.total.toFixed(2)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Email:</span> {order.email}
              </div>
              <div className="text-sm">
                <span className="font-medium">Status:</span>{' '}
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {order.status}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-2 font-medium">Order Items:</h3>
              <ul className="space-y-1 text-sm">
                {items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isTestMode && (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <strong>Test Mode:</strong> This is a test order. No payment was processed. Set{' '}
                <code className="text-xs">PAYMENT_MODE=stripe</code> for real payments.
              </div>
            )}

            <p className="text-sm text-gray-600">
              We&apos;ve sent a confirmation email to <strong>{order.email}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Clear cart after successful order */}
        <ClearCartClient />
      </>
    );
  } catch (error) {
    logger.error('Error fetching order:', error);

    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Order</CardTitle>
          <CardDescription className="text-red-700">
            We couldn&apos;t load your order details, but your payment may have been processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            Please contact support with session ID: <code className="text-xs">{sessionId}</code>
          </p>
        </CardContent>
      </Card>
    );
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  // Check if user is authenticated and has appropriate role
  const session = await auth(); const user = session?.user;
  const userRole = user?.role as string | undefined;
  const canAccessStore = userRole === 'affiliate' || userRole === 'tax_preparer';

  if (!canAccessStore) {
    redirect('/forbidden');
  }

  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Invalid Order</CardTitle>
            <CardDescription className="text-red-700">No session ID provided</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/store">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Back to Store
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">Thank You for Your Order!</h1>
          <p className="text-gray-600">Your order has been received and is being processed.</p>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Loading order details...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 animate-pulse rounded-md bg-gray-100" />
              </CardContent>
            </Card>
          }
        >
          <OrderDetails sessionId={sessionId} />
        </Suspense>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link href="/store">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">
          <p className="mb-2">
            Need help? Contact us at{' '}
            <a
              href="mailto:taxgenius.tax@gmail.com"
              className="font-medium text-blue-600 hover:underline"
            >
              taxgenius.tax@gmail.com
            </a>
          </p>
          <p className="text-xs">Session ID: {sessionId}</p>
        </div>
      </div>
    </div>
  );
}
