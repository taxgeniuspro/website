import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, Target, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">About GangRun Printing</h1>
            <p className="text-xl text-muted-foreground">
              Your trusted partner in professional printing services since 2010
            </p>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Founded in 2010, GangRun Printing started as a small family-owned print shop in
                  Houston, Texas. What began as a passion for quality printing has grown into one of
                  the region's most trusted printing services.
                </p>
                <p>
                  Over the years, we've invested in state-of-the-art printing technology and
                  expanded our team of skilled professionals. Today, we serve thousands of
                  businesses and individuals across the United States, delivering exceptional
                  quality and service with every order.
                </p>
                <p>
                  Our commitment to innovation, quality, and customer satisfaction has made us the
                  go-to choice for businesses looking for reliable printing solutions.
                </p>
              </div>
              <Link href="/products">
                <Button className="mt-6">
                  Explore Our Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">10K+</div>
                  <p className="text-sm text-muted-foreground mt-2">Happy Customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">14+</div>
                  <p className="text-sm text-muted-foreground mt-2">Years Experience</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">50+</div>
                  <p className="text-sm text-muted-foreground mt-2">Product Types</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">24hr</div>
                  <p className="text-sm text-muted-foreground mt-2">Rush Service</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Our Mission & Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Target className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To provide exceptional printing services that help businesses and individuals
                    bring their ideas to life with quality, speed, and affordability.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Sparkles className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Quality First</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We never compromise on quality. Every product that leaves our facility meets our
                    rigorous standards for excellence.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Customer Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your satisfaction is our priority. We go above and beyond to ensure every
                    customer has an exceptional experience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose GangRun Printing?</h2>
            <div className="space-y-4">
              {[
                'State-of-the-art printing technology for superior quality',
                'Fast turnaround times with rush options available',
                '100% satisfaction guarantee on all orders',
                'Competitive pricing with bulk discounts',
                'Expert design assistance available',
                'Eco-friendly printing options',
                'Free shipping on orders over $100',
                'Dedicated customer support team',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied customers who trust us with their printing needs
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" variant="secondary">
                Browse Products
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
