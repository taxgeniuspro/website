import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Package, Grid3x3, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/customer/breadcrumbs'
import { generateCategoryMetadata } from '@/lib/seo/metadata'
import { generateCategorySchema } from '@/lib/seo/schema'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params

  const category = await prisma.productCategory.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
      seoKeywords: true,
      imageUrl: true,
    },
  })

  if (!category) {
    return {
      title: 'Category Not Found',
    }
  }

  return generateCategoryMetadata(
    category.name,
    category.slug,
    category.metaDescription || category.description || undefined,
    category.metaTitle || undefined,
    category.seoKeywords,
    category.imageUrl || undefined
  )
}

// Generate static params for all active categories (ISR optimization)
export async function generateStaticParams() {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    })

    return categories.map((category) => ({
      slug: category.slug,
    }))
  } catch (error) {
    // During build time, database might not be available
    console.warn('Could not fetch categories for static generation:', error)
    return []
  }
}

async function getCategoryData(slug: string) {
  const category = await prisma.productCategory.findUnique({
    where: { slug },
    include: {
      Product: {
        where: { isActive: true },
        include: {
          ProductImage: {
            include: {
              Image: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      },
      Subcategories: {
        where: { isActive: true },
        include: {
          _count: {
            select: { Product: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
      ParentCategory: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: { Product: true },
      },
    },
  })

  return category
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  const category = await getCategoryData(slug)

  if (!category || !category.isActive) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gangrunprinting.com'

  // Build breadcrumbs
  const breadcrumbs = category.ParentCategory
    ? [
        { label: category.ParentCategory.name, href: `/category/${category.ParentCategory.slug}` },
        { label: category.name, href: `/category/${category.slug}` },
      ]
    : [{ label: category.name, href: `/category/${category.slug}` }]

  // Generate schema.org data
  const categorySchema = generateCategorySchema(
    {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      imageUrl: category.imageUrl || undefined,
      productCount: category._count.Product,
    },
    baseUrl
  )

  return (
    <>
      {/* Schema.org structured data */}
      <BreadcrumbSchema items={breadcrumbs} />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
        type="application/ld+json"
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumbs */}
          <Breadcrumbs className="mb-6" items={breadcrumbs} />

          {/* Category Header */}
          {category.imageUrl ? (
            <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8 bg-gradient-to-br from-primary/10 to-primary/5">
              <Image
                fill
                priority
                alt={category.name}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                src={category.imageUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-8 text-white">
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">{category.name}</h1>
                  {category.description && (
                    <p className="text-lg md:text-xl max-w-2xl">{category.description}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{category.name}</h1>
              {category.description && (
                <p className="text-lg text-muted-foreground max-w-3xl">{category.description}</p>
              )}
            </div>
          )}

          {/* Subcategories Section */}
          {category.Subcategories.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Grid3x3 className="h-6 w-6 text-primary" />
                Browse by Type
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.Subcategories.map((subcategory) => (
                  <Link key={subcategory.id} href={`/category/${subcategory.slug}`}>
                    <Card className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{subcategory.name}</h3>
                            {subcategory.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {subcategory.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {subcategory._count.Product}{' '}
                            {subcategory._count.Product === 1 ? 'product' : 'products'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center text-primary text-sm font-medium">
                          View Products
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                {category.Subcategories.length > 0 ? 'All Products' : 'Products'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {category._count.Product} {category._count.Product === 1 ? 'product' : 'products'}{' '}
                available
              </p>
            </div>

            {category.Product.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
                  <p className="text-muted-foreground mb-6">
                    This category doesn't have any products yet. Check back soon!
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/products">Browse All Products</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Suspense
                  fallback={
                    <div className="col-span-full text-center py-12">Loading products...</div>
                  }
                >
                  {category.Product.map((product) => {
                    const productImage = product.ProductImage[0]?.Image
                    const imageUrl = productImage?.thumbnailUrl || productImage?.url

                    return (
                      <Link key={product.id} href={`/products/${product.slug}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-primary/50 group cursor-pointer h-full">
                          <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                            {product.isFeatured && (
                              <Badge className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground">
                                Featured
                              </Badge>
                            )}
                            <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform relative">
                              {imageUrl ? (
                                <Image
                                  fill
                                  alt={productImage?.alt || product.name}
                                  className="w-full h-full object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                  src={imageUrl}
                                />
                              ) : (
                                <Package className="h-20 w-20 text-primary/30" />
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {product.shortDescription || product.description || ''}
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-muted-foreground">Starting at</span>
                                <p className="text-lg font-bold text-primary">
                                  ${product.basePrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
