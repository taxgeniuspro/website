'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useShoppingCart } from '@/lib/hooks/useShoppingCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CartIcon() {
  const { data: session } = useSession(); const user = session?.user;
  const getItemCount = useShoppingCart((state) => state.getItemCount);
  const itemCount = getItemCount();

  // Only show cart for admins and tax preparers
  const userRole = user?.publicMetadata?.role as string | undefined;
  const canAccessCart = userRole === 'admin' || userRole === 'super_admin' || userRole === 'tax_preparer';

  if (!canAccessCart) {
    return null;
  }

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/store/cart">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {itemCount > 9 ? '9+' : itemCount}
          </Badge>
        )}
        <span className="sr-only">Shopping cart with {itemCount} items</span>
      </Link>
    </Button>
  );
}
