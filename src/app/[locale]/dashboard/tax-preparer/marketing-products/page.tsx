'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  ShoppingCart,
  Loader2,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductPreviewCanvas, ProductType } from '@/components/marketing/ProductPreviewCanvas';

interface Product {
  id: string;
  type: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  printable: boolean;
  sku: string;
  metadata: any;
}

export default function MarketingProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProductType>('business_card');

  // Fetch profile data for preview
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
  });

  // Fetch marketing products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['marketing-products'],
    queryFn: async () => {
      const response = await fetch('/api/products?type=MARKETING_MATERIAL');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      return data.products || [];
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (product: Product) => {
      // In a real implementation, this would call the cart API
      // For now, we'll use localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      const existingItem = cart.find((item: any) => item.productId === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          customization: {
            profileSnapshot: {
              firstName: profile?.firstName,
              lastName: profile?.lastName,
              companyName: profile?.companyName,
              professionalTitle: profile?.professionalTitle,
              phone: profile?.phone,
              email: session?.user?.email,
              website: profile?.website,
              publicAddress: profile?.publicAddress,
              qrCodeLogoUrl: profile?.qrCodeLogoUrl,
            },
            qrCodeUrl: profile?.trackingCodeQRUrl,
          },
        });
      }

      localStorage.setItem('cart', JSON.stringify(cart));

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Product added to cart!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      toast.error('Failed to add product to cart');
    },
  });

  const getProductByType = (productType: ProductType): Product | undefined => {
    return products?.find((p) => p.metadata?.productType === productType);
  };

  const getUserData = () => ({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    companyName: profile?.companyName || '',
    professionalTitle: profile?.professionalTitle || '',
    phone: profile?.phone || '',
    email: session?.user?.email || '',
    website: profile?.website || '',
    publicAddress: profile?.publicAddress || '',
    qrCodeLogoUrl: profile?.qrCodeLogoUrl || '',
  });

  const renderProductTab = (productType: ProductType) => {
    const product = getProductByType(productType);

    if (!product) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Product not available</p>
          </div>
        </div>
      );
    }

    const metadata = product.metadata || {};

    return (
      <div className="space-y-6">
        {/* Product Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {product.name}
                  <Badge variant="secondary">{metadata.quantity} count</Badge>
                </CardTitle>
                <CardDescription className="mt-2">{product.description}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">${product.price}</p>
                <p className="text-xs text-muted-foreground">per order</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Product Details</h4>
                <ul className="space-y-1 text-muted-foreground">
                  {metadata.dimensions && (
                    <li>
                      • Size: {metadata.dimensions.width}" x {metadata.dimensions.height}"
                    </li>
                  )}
                  {metadata.material && <li>• Material: {metadata.material}</li>}
                  {metadata.finish && <li>• Finish: {metadata.finish}</li>}
                  {metadata.printingTime && <li>• Turnaround: {metadata.printingTime}</li>}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  {metadata.includesPhoto && <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Your photo included</li>}
                  {metadata.includesQRCode && <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> QR code included</li>}
                  {metadata.customizable && <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Customizable design</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              This is how your {product.name.toLowerCase()} will look with your information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !profile?.qrCodeLogoUrl && !profile?.trackingCodeQRUrl ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-orange-500" />
                <div>
                  <h4 className="font-semibold mb-2">Complete Your Marketing Profile First</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up your profile photo and contact information to see a preview
                  </p>
                  <Button onClick={() => router.push('/dashboard/tax-preparer/setup-marketing-profile')}>
                    Complete Setup
                  </Button>
                </div>
              </div>
            ) : (
              <ProductPreviewCanvas
                productType={productType}
                userData={getUserData()}
                qrCodeUrl={profile?.trackingCodeQRUrl || ''}
                className="max-w-2xl mx-auto"
              />
            )}
          </CardContent>
        </Card>

        {/* Use Cases (if available) */}
        {metadata.useCases && (
          <Card>
            <CardHeader>
              <CardTitle>Perfect For</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid md:grid-cols-2 gap-2">
                {metadata.useCases.map((useCase: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{useCase}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Add to Cart */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">Ready to order?</h4>
                <p className="text-sm text-muted-foreground">
                  Add to cart and checkout when you're ready
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => addToCartMutation.mutate(product)}
                disabled={addToCartMutation.isPending || !profile?.qrCodeLogoUrl}
              >
                {addToCartMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart - ${product.price}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-8 h-8" />
            Marketing Products Toolkit
          </h1>
          <p className="text-muted-foreground mt-1">
            Order professional marketing materials with your photo, QR code, and contact info
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/store/cart')}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Cart
        </Button>
      </div>

      <Separator />

      {/* Tabs for Products */}
      {productsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business_card">Business Cards</TabsTrigger>
            <TabsTrigger value="postcard">4x6 Postcards</TabsTrigger>
            <TabsTrigger value="door_hanger">Door Hangers</TabsTrigger>
            <TabsTrigger value="poster">Posters</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="business_card">{renderProductTab('business_card')}</TabsContent>
            <TabsContent value="postcard">{renderProductTab('postcard')}</TabsContent>
            <TabsContent value="door_hanger">{renderProductTab('door_hanger')}</TabsContent>
            <TabsContent value="poster">{renderProductTab('poster')}</TabsContent>
          </div>
        </Tabs>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p>
              Browse the tabs to see all available marketing products and their live previews with your
              information
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p>Add products to your cart - you can order multiple types at once</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p>
              Checkout when you're ready - your materials will be professionally printed and shipped to
              you
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <p>
              Update your profile information anytime from settings, and it will automatically update on
              future orders
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
