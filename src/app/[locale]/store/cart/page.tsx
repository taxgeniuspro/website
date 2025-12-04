'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useShoppingCart } from '@/lib/hooks/useShoppingCart';
import { CartItem } from '../_components/CartItem';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!session?.user;
  const { items, getTotal, getItemCount } = useShoppingCart();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if user has access to store
  const userRole = user?.role as string | undefined;
  const canAccessStore = userRole === 'affiliate' || userRole === 'tax_preparer';

  // Prevent hydration mismatch by only rendering cart after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if user doesn't have access
  useEffect(() => {
    if (mounted && !canAccessStore) {
      router.push('/forbidden');
    }
  }, [mounted, canAccessStore, router]);

  const subtotal = getTotal();
  const tax = 0; // 0% tax for MVP
  const total = subtotal + tax;
  const itemCount = getItemCount();

  const handleCheckout = async () => {
    // Check authentication
    if (!isSignedIn) {
      toast.error('Please sign in to continue', {
        description: 'You need to be signed in to checkout.',
      });
      router.push('/auth/signin?redirect=/store/cart');
      return;
    }

    // Check cart not empty
    if (items.length === 0) {
      toast.error('Your cart is empty', {
        description: 'Add some items to your cart before checking out.',
      });
      return;
    }

    // Redirect to checkout page
    router.push('/store/checkout');
  };

  // Show loading state during SSR/hydration
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/store"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Link>
        <h1 className="text-4xl font-bold">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {itemCount > 0
            ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in your cart`
            : 'Your cart is empty'}
        </p>
      </div>

      {items.length === 0 ? (
        /* Empty Cart State */
        <Card className="text-center py-12">
          <CardContent className="pt-6">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add some items from our store to get started!
            </p>
            <Button asChild size="lg">
              <Link href="/store">Browse Store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Cart with Items */
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                {items.map((item) => (
                  <CartItem key={item.productId} item={item} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleCheckout}
                  disabled={isLoading || items.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Processing...' : 'Proceed to Checkout'}
                </Button>
              </CardFooter>
              {!isSignedIn && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center">
                    You need to sign in to checkout
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
