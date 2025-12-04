'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShoppingCart, CartItem as CartItemType } from '@/lib/hooks/useShoppingCart';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useShoppingCart();

  const handleIncrement = () => {
    updateQuantity(item.productId, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.productId);
  };

  const subtotal = item.price * item.quantity;

  return (
    <div className="flex gap-4 py-4 border-b">
      {/* Product Image */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="96px" />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-muted-foreground text-sm">${item.price.toFixed(2)} each</p>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className="w-12 text-center font-medium">{item.quantity}</span>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleIncrement}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Subtotal and Remove */}
      <div className="flex flex-col items-end justify-between">
        <div className="font-bold text-lg">${subtotal.toFixed(2)}</div>

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
