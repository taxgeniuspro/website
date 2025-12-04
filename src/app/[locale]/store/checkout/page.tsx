'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useShoppingCart } from '@/lib/hooks/useShoppingCart';
import { CompleteCheckoutFlow } from '@/components/checkout/complete-checkout-flow';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!session?.user;
  const { items, clearCart } = useShoppingCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isSignedIn) {
      router.push('/auth/signin?redirect=/store/checkout');
    }
  }, [mounted, isSignedIn, router]);

  useEffect(() => {
    if (mounted && items.length === 0) {
      toast.info('Your cart is empty');
      router.push('/store');
    }
  }, [mounted, items, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  // Convert cart items to checkout format with shipping info from product metadata
  const checkoutItems = items.map((item) => {
    // Get shipping info from product metadata (or use defaults)
    const metadata = (item as any).metadata || {};
    const weight = metadata.weight || 1; // Default 1 lb
    const dimensions = metadata.dimensions || { length: 12, width: 9, height: 2 };

    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      weight: weight,
      dimensions: dimensions,
      customerImageUrl: item.imageUrl,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/store/cart"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">Complete your purchase with shipping</p>
        </div>

        {/* Complete Checkout Flow with Shipping */}
        <CompleteCheckoutFlow
          items={checkoutItems}
          userEmail={user?.primaryEmailAddress?.emailAddress}
        />
      </div>
    </div>
  );
}
