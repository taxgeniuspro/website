import Link from 'next/link'
import {
  ArrowRight,
  Package,
  Clock,
  Shield,
  Star,
  CheckCircle,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { HomepageHero } from '@/components/customer/homepage-hero'
import { CategoryGrid } from '@/components/customer/category-grid'
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateCombinedSchema,
  schemaToJsonLd,
} from '@/lib/seo/schema'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Marketing Manager',
    company: 'Tech Startup',
    content:
      'The quality of printing exceeded our expectations. Fast delivery and excellent customer service!',
    rating: 5,
    avatar: 'SJ',
  },
  {
    name: 'Mike Chen',
    role: 'Owner',
    company: 'Local Restaurant',
    content:
      "We've been using GangRun for all our printing needs. Consistently great results and competitive pricing.",
    rating: 5,
    avatar: 'MC',
  },
  {
    name: 'Emily Davis',
    role: 'Event Planner',
    company: 'Davis Events',
    content:
      'Their rush printing service saved our event! Professional quality delivered on time, every time.',
    rating: 5,
    avatar: 'ED',
  },
]

export default async function Home() {
  // Fetch real product categories from database (excluding hidden ones)
  const productCategories = await prisma.productCategory.findMany({
    where: {
      isActive: true,
      isHidden: false, // Don't show hidden categories like "Landing Page Folder"
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sortOrder: true,
      _count: {
        select: {
          Product: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: {
      sortOrder: 'asc',
    },
    take: 6, // Show first 6 categories on homepage
  })

  // Fetch featured products from database
  const featuredProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      shortDescription: true,
      ProductImage: {
        select: {
          Image: {
            select: {
              url: true,
              thumbnailUrl: true,
              alt: true,
            },
          },
          isPrimary: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        take: 1,
      },
      ProductCategory: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: 6,
  })

  // If no featured products, get latest products
  const displayProducts =
    featuredProducts.length > 0
      ? featuredProducts
      : await prisma.product.findMany({
          where: {
            isActive: true,
            ProductCategory: {
              isHidden: false,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            shortDescription: true,
            ProductImage: {
              select: {
                Image: {
                  select: {
                    url: true,
                    thumbnailUrl: true,
                    alt: true,
                  },
                },
                isPrimary: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
              take: 1,
            },
            ProductCategory: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 6,
        })

  // Generate schema markup
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gangrunprinting.com'
  const organizationSchema = generateOrganizationSchema(baseUrl)
  const websiteSchema = generateWebSiteSchema(baseUrl)
  const combinedSchema = generateCombinedSchema(organizationSchema, websiteSchema)

  return (
    <main className="min-h-screen">
      {/* JSON-LD Schema Markup for SEO */}
      <script
        dangerouslySetInnerHTML={{ __html: schemaToJsonLd(combinedSchema) }}
        type="application/ld+json"
      />

      {/* Hero Section with Rotating Specials */}
      <section className="container mx-auto px-4 py-8">
        <HomepageHero />
      </section>

      {/* Quick Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">24hr</div>
              <div className="text-sm text-muted-foreground">Fast Turnaround</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Quality Guarantee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Product Types</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories - Now with REAL data */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Choose Your Product</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select from our wide range of printing products. Each category offers multiple
              customization options.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {productCategories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 group cursor-pointer overflow-hidden">
                  <div className="aspect-[4/3] relative bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                    {category._count.Product > 10 && (
                      <Badge
                        className="absolute top-3 right-3 z-10 bg-primary/10 text-primary border-primary/20"
                        variant="secondary"
                      >
                        Popular
                      </Badge>
                    )}
                    <div className="w-full h-full flex flex-col items-center justify-center p-6">
                      <div className="w-full h-full bg-white/50 rounded-lg shadow-sm flex items-center justify-center">
                        <div className="text-center">
                          <Package className="h-16 w-16 text-primary/40 mx-auto mb-2" />
                          <span className="text-xs text-muted-foreground">
                            {category._count.Product} products
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {category.name}
                    </CardTitle>
                    <CardDescription>
                      {category.description || `Browse our ${category.name.toLowerCase()} products`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-primary">
                      <span className="text-sm font-medium">Get Started</span>
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {productCategories.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No product categories available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Carousel - Now with REAL data */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our most popular products with competitive pricing and fast delivery
            </p>
          </div>
          {displayProducts.length > 0 ? (
            <Carousel className="max-w-5xl mx-auto">
              <CarouselContent className="-ml-4">
                {displayProducts.map((product) => {
                  const primaryImage = product.ProductImage?.[0]?.Image
                  return (
                    <CarouselItem key={product.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <Link href={`/products/${product.slug}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                          <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 relative">
                            <Badge className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground">
                              Featured
                            </Badge>
                            <div className="flex items-center justify-center h-full relative">
                              {primaryImage ? (
                                <Image
                                  fill
                                  alt={primaryImage.alt || product.name}
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  src={primaryImage.thumbnailUrl || primaryImage.url}
                                />
                              ) : (
                                <Package className="h-20 w-20 text-primary/30" />
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {product.ProductCategory?.name || 'Products'}
                            </p>
                            <p className="text-primary font-bold">
                              Starting at ${product.basePrice.toFixed(2)}
                            </p>
                            <Button asChild className="w-full mt-4" size="sm" variant="outline">
                              <span>View Details</span>
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No featured products available yet.</p>
              <Button asChild variant="outline">
                <Link href="/products">Browse All Products</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why Choose GangRun Printing?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine quality, speed, and service to deliver exceptional printing solutions
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Fast Turnaround</h3>
              <p className="text-sm text-muted-foreground">
                Same-day and next-day printing options available
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Quality Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                100% satisfaction or we'll reprint for free
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Expert Support</h3>
              <p className="text-sm text-muted-foreground">
                Free design consultation and file review
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Business Growth</h3>
              <p className="text-sm text-muted-foreground">
                Solutions that scale with your business
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Don't just take our word for it - hear from our satisfied customers
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 overflow-hidden">
            <CardContent className="p-8 sm:p-12 lg:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Upload your design and receive your custom printed products in as little as 24 hours
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="group" size="lg" variant="secondary">
                  <Link href="/products">
                    Browse Products
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  className="border-white text-white hover:bg-white/20"
                  size="lg"
                  variant="outline"
                >
                  <Link href="/quote">Get a Quote</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 mt-8 pt-8 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Free Design Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">No Setup Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">100% Satisfaction</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
