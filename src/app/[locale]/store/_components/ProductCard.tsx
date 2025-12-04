'use client';

import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShoppingCart } from '@/lib/hooks/useShoppingCart';
import { toast } from 'sonner';

interface ProductImage {
  url: string;
  altText: string;
  isPrimary: boolean;
  isClientUpload: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  images?: ProductImage[];
  category: string | null;
  printable?: boolean | null;
  digitalDownload?: boolean | null;
  stock?: number | null;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useShoppingCart((state) => state.addItem);

  // Get primary image or fallback to imageUrl
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  const displayImage = primaryImage?.url || product.imageUrl || '/placeholder-product.png';
  const imageAlt = primaryImage?.altText || product.name;

  const handleAddToCart = () => {
    // Check stock availability
    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      toast.error('Out of stock', {
        description: `${product.name} is currently out of stock.`,
      });
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: displayImage,
    });

    toast.success('Added to cart!', {
      description: `${product.name} has been added to your cart.`,
    });
  };

  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <Image
          src={displayImage}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
          priority={false}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">OUT OF STOCK</span>
          </div>
        )}
        {product.printable && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            Customizable
          </div>
        )}
        {product.digitalDownload && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Digital
          </div>
        )}
      </div>

      <CardHeader className="flex-1">
        <CardTitle className="line-clamp-2">{product.name}</CardTitle>
        {product.description && (
          <CardDescription className="line-clamp-3">{product.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.category && (
            <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-full">
              {product.category}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleAddToCart} className="w-full" size="lg" disabled={isOutOfStock}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
}
