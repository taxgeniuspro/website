import { HeroSection } from '@/components/wordpress/hero-section';
import { ServiceGrid } from '@/components/wordpress/service-grid';
import { ContactForm } from '@/components/wordpress/contact-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function WordPressLandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl font-bold">$3,452</h3>
                <p className="text-sm text-muted-foreground">Average Refund</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl font-bold">10,000+</h3>
                <p className="text-sm text-muted-foreground">Happy Clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Star className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl font-bold">4.9/5</h3>
                <p className="text-sm text-muted-foreground">Client Rating</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl font-bold">99.8%</h3>
                <p className="text-sm text-muted-foreground">Accuracy Rate</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <ServiceGrid />

      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Why Choose Tax Genius?</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              {[
                {
                  title: 'Expert Tax Professionals',
                  description:
                    'Our certified tax preparers have years of experience handling complex tax situations.',
                },
                {
                  title: 'Maximum Refund Guarantee',
                  description: "We ensure you get every deduction and credit you're entitled to.",
                },
                {
                  title: 'Year-Round Support',
                  description: "Tax questions don't stop after April. Neither do we.",
                },
                {
                  title: 'Secure & Confidential',
                  description:
                    'Bank-level encryption protects your sensitive financial information.',
                },
                {
                  title: 'Transparent Pricing',
                  description: "No hidden fees. Know exactly what you'll pay before you start.",
                },
                {
                  title: 'Fast Turnaround',
                  description: 'Most returns completed within 48 hours of receiving all documents.',
                },
              ].map((item, idx) => (
                <Card key={idx} className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of satisfied clients who trust Tax Genius with their tax preparation
                needs.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/onboarding">Start Your Tax Return</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ContactForm />
    </main>
  );
}
