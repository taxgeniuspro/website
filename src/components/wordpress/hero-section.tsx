'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, FileText, Users, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
}

export function HeroSection({
  title = 'Professional Tax Services Made Simple',
  subtitle = 'Expert tax preparation, planning, and advice to maximize your refund',
  ctaText = 'Get Started',
  ctaLink = '/onboarding',
  imageUrl = '/wp-images/tax-genius-hero.svg',
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[600px] flex items-center">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">{title}</h1>
            <p className="text-xl text-muted-foreground">{subtitle}</p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href={ctaLink}>
                  {ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-8">
              <Card className="p-4 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Easy Filing</p>
              </Card>
              <Card className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Expert Support</p>
              </Card>
              <Card className="p-4 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Secure & Private</p>
              </Card>
            </div>
          </div>
          <div className="relative h-[500px] lg:h-[600px]">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt="Tax Genius Professional Services"
                fill
                className="object-contain"
                priority
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
