'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, CheckCircle, Shield, Award } from 'lucide-react';
import Link from 'next/link';
import { generateAggregateRatingSchema } from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';
import { useTranslations } from 'next-intl';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Small Business Owner',
    location: 'Atlanta, GA',
    rating: 5,
    text: 'TaxGeniusPro saved me thousands on my business taxes. Their team is professional, knowledgeable, and always available to answer questions. I highly recommend them!',
    service: 'Business Tax Services',
    year: '2024',
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Software Engineer',
    location: 'Decatur, GA',
    rating: 5,
    text: "Best tax preparation experience I've ever had. They found deductions I didn't even know existed and made the whole process stress-free. Will definitely use them again next year.",
    service: 'Personal Tax Filing',
    year: '2024',
  },
  {
    id: 3,
    name: 'Jennifer Martinez',
    role: 'Real Estate Agent',
    location: 'Marietta, GA',
    rating: 5,
    text: 'As a real estate professional, my taxes are complex. TaxGeniusPro handled everything expertly and got me a larger refund than I expected. Their attention to detail is impressive!',
    service: 'Tax Planning & Advisory',
    year: '2024',
  },
  {
    id: 4,
    name: 'David Williams',
    role: 'Restaurant Owner',
    location: 'Atlanta, GA',
    rating: 5,
    text: "I was facing an IRS audit and was terrified. TaxGeniusPro's audit protection service guided me through the entire process and everything was resolved smoothly. Truly grateful!",
    service: 'Audit Protection',
    year: '2023',
  },
  {
    id: 5,
    name: 'Lisa Thompson',
    role: 'Healthcare Professional',
    location: 'Sandy Springs, GA',
    rating: 5,
    text: "The team at TaxGeniusPro is amazing! They're responsive, professional, and really care about getting the best outcome for their clients. I trust them completely with my taxes.",
    service: 'Personal Tax Filing',
    year: '2024',
  },
  {
    id: 6,
    name: 'Robert Anderson',
    role: 'Freelance Consultant',
    location: 'Alpharetta, GA',
    rating: 5,
    text: "Working with TaxGeniusPro has been a game-changer for my freelance business. They help me stay compliant and maximize my deductions. Couldn't be happier with their service!",
    service: 'Business Tax Services',
    year: '2024',
  },
  {
    id: 7,
    name: 'Amanda Garcia',
    role: 'Nonprofit Director',
    location: 'Atlanta, GA',
    rating: 5,
    text: 'Our nonprofit has worked with TaxGeniusPro for three years now. They understand our unique needs and always deliver exceptional service. Highly recommended!',
    service: 'Business Tax Services',
    year: '2022-2024',
  },
  {
    id: 8,
    name: 'James Brown',
    role: 'Retired Teacher',
    location: 'Roswell, GA',
    rating: 5,
    text: "I was overwhelmed with tax debt and didn't know where to turn. TaxGeniusPro's IRS resolution team negotiated a payment plan I could afford. They saved my retirement!",
    service: 'IRS Resolution Services',
    year: '2023',
  },
  {
    id: 9,
    name: 'Patricia Davis',
    role: 'E-commerce Entrepreneur',
    location: 'Duluth, GA',
    rating: 5,
    text: "Managing multi-state sales tax was a nightmare until I found TaxGeniusPro. They simplified everything and ensured I'm fully compliant. Worth every penny!",
    service: 'Business Tax Services',
    year: '2024',
  },
  {
    id: 10,
    name: 'Kevin Miller',
    role: 'Construction Contractor',
    location: 'Kennesaw, GA',
    rating: 5,
    text: "TaxGeniusPro has been doing my taxes for 5 years. They're reliable, affordable, and always get me the maximum refund. I refer all my subcontractors to them!",
    service: 'Personal Tax Filing',
    year: '2019-2024',
  },
  {
    id: 11,
    name: 'Rachel Kim',
    role: 'Marketing Director',
    location: 'Atlanta, GA',
    rating: 5,
    text: 'The complimentary vacation package was an unexpected bonus! But what really impressed me was the professional service and the peace of mind knowing my taxes were done right.',
    service: 'Personal Tax Filing',
    year: '2024',
  },
  {
    id: 12,
    name: 'Christopher Lee',
    role: 'Tech Startup Founder',
    location: 'Atlanta, GA',
    rating: 5,
    text: "As a startup founder, cash flow is critical. TaxGeniusPro's strategic tax planning saved my company significant money, which we reinvested into growth. They're part of our success story!",
    service: 'Tax Planning & Advisory',
    year: '2023-2024',
  },
];

export default function TestimonialsPage() {
  const t = useTranslations('testimonials');
  const aggregateRatingSchema = generateAggregateRatingSchema();

  const stats = [
    { number: t('stats.clients'), label: t('stats.clientsLabel') },
    { number: t('stats.rating'), label: t('stats.ratingLabel') },
    { number: t('stats.experience'), label: t('stats.experienceLabel') },
    { number: t('stats.retention'), label: t('stats.retentionLabel') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* AggregateRating Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-20 border-b">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">
              <Award className="w-3 h-3 mr-1" />
              {t('hero.badge')}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('hero.description')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Quote Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <Quote className="w-8 h-8 text-primary/20" />
                    <div className="flex gap-0.5">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>

                  {/* Testimonial Text */}
                  <p className="text-foreground/80 mb-6 leading-relaxed">"{testimonial.text}"</p>

                  {/* Service Badge */}
                  <Badge variant="secondary" className="mb-4 text-xs">
                    {testimonial.service}
                  </Badge>

                  {/* Author Info */}
                  <div className="border-t pt-4">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {testimonial.location} • {testimonial.year}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">{t('trust.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t('trust.card1Title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('trust.card1Description')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t('trust.card2Title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('trust.card2Description')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t('trust.card3Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('trust.card3Description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t('cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/start-filing">{t('cta.ctaStart')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">{t('cta.ctaContact')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
