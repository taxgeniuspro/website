'use client';

import { useEffect } from 'react';
import { useShoppingCart } from '@/lib/hooks/useShoppingCart';

export function ClearCartClient() {
  const clearCart = useShoppingCart((state) => state.clearCart);

  useEffect(() => {
    // Clear cart on success page mount
    clearCart();
  }, [clearCart]);

  return null;
}
