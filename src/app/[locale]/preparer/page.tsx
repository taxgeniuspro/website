'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Calendar,
  CheckCircle,
  Award,
  Laptop,
  FileText,
  BarChart3,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PreparerPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/wordpress-assets/taxgenius-logo.png"
                alt="Tax Genius Pro"
                width={200}
                height={50}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost">Back to Home</Button>
              </Link>
              <Link href="/auth/signup?role=preparer">
                <Button className="bg-primary hover:bg-primary/90">
                  Apply Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Award className="w-4 h-4 mr-1" />
                Professional Tax Preparer Opportunity
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Become a <span className="text-primary">Tax Preparer</span> with Tax Genius Pro
              </h1>

              <p className="text-xl text-muted-foreground">
                Join our network of professional tax preparers and build a rewarding career helping
                clients maximize their refunds. Work on your schedule, earn competitive pay, and
                grow your practice.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 shadow-xl">
                  Start Your Application <ArrowRight className="ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 border-2">
                  Learn More
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">$45-75</p>
                  <p className="text-sm text-muted-foreground">Per Return</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">Flexible</p>
                  <p className="text-sm text-muted-foreground">Schedule</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">Remote</p>
                  <p className="text-sm text-muted-foreground">Work</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-blue-50 dark:bg-blue-900/20">
                {/* IMAGE PLACEHOLDER - Replace with actual preparer hero image */}
                <div className="aspect-square flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <Award className="w-24 h-24 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-muted-foreground mb-2">
                      [Replace with professional tax preparer hero image]
                    </p>
                    <p className="text-sm text-muted-foreground">Recommended: 800x800px</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Suggestion: Professional working at desk, happy preparer with clients, or team
                      photo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Why Join Our Network?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Build your tax preparation career with industry-leading support and resources
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: 'Competitive Earnings',
                description: 'Earn $45-75 per return with bonus opportunities during peak season',
                highlight: 'Up to $5,000/month',
              },
              {
                icon: Clock,
                title: 'Flexible Schedule',
                description:
                  'Work when you want, from wherever you want. Perfect for side income or full-time',
                highlight: 'Your hours, your way',
              },
              {
                icon: Laptop,
                title: 'Work Remotely',
                description:
                  'All you need is a computer and internet connection. Work from home or anywhere',
                highlight: '100% remote',
              },
              {
                icon: Users,
                title: 'Client Support',
                description:
                  'We handle marketing, client acquisition, and payment processing for you',
                highlight: 'Focus on what you do best',
              },
              {
                icon: Shield,
                title: 'E&O Insurance',
                description: 'Professional liability insurance included at no cost to you',
                highlight: 'Full coverage',
              },
              {
                icon: BarChart3,
                title: 'Modern Platform',
                description: 'State-of-the-art tax software and client management tools included',
                highlight: 'All tools provided',
              },
            ].map((benefit, index) => (
              <Card
                key={index}
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  <Badge className="w-fit bg-primary/10 text-primary border-primary/20">
                    {benefit.highlight}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">Requirements</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                    Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Active CPA, EA, or AFSP certification</p>
                  </div>
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Valid PTIN (Preparer Tax Identification Number)</p>
                  </div>
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Clean background check</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Minimum 2 years tax preparation experience</p>
                  </div>
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Proficient with tax software (Drake, ProSeries, etc.)</p>
                  </div>
                  <div className="flex items-start">
                    <Star className="w-4 h-4 mr-2 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm">Strong communication and client service skills</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Apply Online',
                description: 'Submit your application with credentials',
              },
              {
                step: '2',
                title: 'Background Check',
                description: 'We verify your credentials and experience',
              },
              {
                step: '3',
                title: 'Platform Training',
                description: 'Get onboarded to our tax platform',
              },
              {
                step: '4',
                title: 'Start Preparing',
                description: 'Receive clients and start earning',
              },
            ].map((item, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                    {item.step}
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <Card className="bg-primary/10 border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <CardContent className="p-12 text-center relative">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">Ready to Join Our Team?</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start your application today and become part of our growing network of tax
                professionals
              </p>
              <Link href="/auth/signup?role=preparer">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 shadow-xl">
                  Apply Now <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <p className="mt-6 text-sm text-muted-foreground">
                Questions? Email us at preparers@taxgeniuspro.com
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <Link href="/">
            <Image
              src="/images/wordpress-assets/taxgenius-logo.png"
              alt="Tax Genius Pro"
              width={150}
              height={40}
              className="h-10 w-auto mx-auto mb-4"
            />
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2024 Tax Genius Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
