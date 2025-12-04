import { prisma } from '@/lib/prisma';
import { ProductCard } from './_components/ProductCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Package, QrCode, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'store.metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

async function getProducts() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Convert Decimal to number for client components
  return products.map((product) => ({
    ...product,
    price: Number(product.price),
  }));
}

export default async function StorePage({ params }: { params: { locale: string } }) {
  // Authentication and access control handled in layout.tsx
  const products = await getProducts();
  const t = await getTranslations({ locale: params.locale, namespace: 'store' });

  // Group products by category
  const landingPages = products.filter((p) => p.type === 'LANDING_PAGE');
  const marketingMaterials = products.filter((p) => p.type === 'MARKETING_MATERIAL');
  const digitalAssets = products.filter((p) => p.type === 'DIGITAL_ASSET');
  const emailAddresses = products.filter((p) => p.type === 'EMAIL_ADDRESS');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('header.title')}</h1>
        <p className="text-muted-foreground text-lg">{t('header.subtitle')}</p>
      </div>

      {/* Featured Subscription Plans */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          {t('subscriptions.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>{t('subscriptions.free.name')}</CardTitle>
                <Badge variant="secondary">{t('subscriptions.free.badge')}</Badge>
              </div>
              <CardDescription>{t('subscriptions.free.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">{t('subscriptions.free.price')}</span>
                <span className="text-muted-foreground">{t('subscriptions.free.priceUnit')}</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.free.feature1')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.free.feature2')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.free.feature3')}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <Card className="border-2 border-primary shadow-lg relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="px-4">{t('subscriptions.monthly.badge')}</Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>{t('subscriptions.monthly.name')}</CardTitle>
                <Badge>{t('subscriptions.monthly.badgeProfessional')}</Badge>
              </div>
              <CardDescription>{t('subscriptions.monthly.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">{t('subscriptions.monthly.price')}</span>
                <span className="text-muted-foreground">{t('subscriptions.monthly.priceUnit')}</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.monthly.feature1')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.monthly.feature2')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.monthly.feature3')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.monthly.feature4')}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>{t('subscriptions.annual.name')}</CardTitle>
                <Badge variant="secondary">{t('subscriptions.annual.badge')}</Badge>
              </div>
              <CardDescription>{t('subscriptions.annual.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">{t('subscriptions.annual.price')}</span>
                <span className="text-muted-foreground">{t('subscriptions.annual.priceUnit')}</span>
                <p className="text-xs text-muted-foreground">
                  {t('subscriptions.annual.priceBilledAnnually')}
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.annual.feature1')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.annual.feature2')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.annual.feature3')}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {t('subscriptions.annual.feature4')}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Categories */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
          <TabsTrigger value="materials">{t('tabs.materials')}</TabsTrigger>
          <TabsTrigger value="digital">{t('tabs.digital')}</TabsTrigger>
          <TabsTrigger value="qr">{t('tabs.qr')}</TabsTrigger>
          <TabsTrigger value="email">{t('tabs.email')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg">{t('empty.noProducts')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="materials">
          {marketingMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {marketingMaterials.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('empty.noMaterials')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="digital">
          {digitalAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {digitalAssets.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('empty.noDigitalAssets')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="qr">
          <div className="text-center py-12">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t('empty.qrCodesInfo')}</p>
          </div>
        </TabsContent>

        <TabsContent value="email">
          {emailAddresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {emailAddresses.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('empty.emailAddressesComingSoon')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
