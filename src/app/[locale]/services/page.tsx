'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Building,
  Home,
  DollarSign,
  Shield,
  Users,
  Calculator,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Zap,
  Award,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { servicesOverviewFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';
import { useTranslations } from 'next-intl';

export default function ServicesPage() {
  const t = useTranslations('services.overview');
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              {t('badge')}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              {t('title')} <span className="text-primary">{t('titleHighlight')}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Individual Tax Returns */}
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all">
              <CardHeader>
                <FileText className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl">{t('individual.title')}</CardTitle>
                <CardDescription>
                  {t('individual.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('individual.feature1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('individual.feature2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('individual.feature3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('individual.feature4')}</span>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-2xl font-bold text-primary mb-2">{t('individual.price')}</p>
                  <Button className="w-full" asChild>
                    <Link href="/start-filing/form">{t('individual.cta')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Business Tax Returns */}
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all">
              <CardHeader>
                <Building className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl">{t('business.title')}</CardTitle>
                <CardDescription>
                  {t('business.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('business.feature1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('business.feature2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('business.feature3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('business.feature4')}</span>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-2xl font-bold text-primary mb-2">{t('business.price')}</p>
                  <Button className="w-full" asChild>
                    <Link href="/start-filing/form">{t('business.cta')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Real Estate Professional */}
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all">
              <CardHeader>
                <Home className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl">{t('realEstate.title')}</CardTitle>
                <CardDescription>
                  {t('realEstate.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('realEstate.feature1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('realEstate.feature2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('realEstate.feature3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('realEstate.feature4')}</span>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-2xl font-bold text-primary mb-2">{t('realEstate.price')}</p>
                  <Button className="w-full" asChild>
                    <Link href="/start-filing/form">{t('realEstate.cta')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {t('additionalServices.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('additionalServices.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <DollarSign className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('additionalServices.taxAdvance.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('additionalServices.taxAdvance.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('additionalServices.auditProtection.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('additionalServices.auditProtection.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <Calculator className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('additionalServices.taxPlanning.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('additionalServices.taxPlanning.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <Clock className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('additionalServices.priorYear.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('additionalServices.priorYear.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">{t('process.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('process.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">{t('process.step1.title')}</h3>
              <p className="text-muted-foreground">
                {t('process.step1.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">{t('process.step2.title')}</h3>
              <p className="text-muted-foreground">
                {t('process.step2.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">{t('process.step3.title')}</h3>
              <p className="text-muted-foreground">
                {t('process.step3.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">{t('process.step4.title')}</h3>
              <p className="text-muted-foreground">
                {t('process.step4.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                {t('whyChoose.title')}
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Award className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">{t('whyChoose.benefit1.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('whyChoose.benefit1.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <TrendingUp className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">{t('whyChoose.benefit2.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('whyChoose.benefit2.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Zap className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">{t('whyChoose.benefit3.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('whyChoose.benefit3.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">{t('whyChoose.benefit4.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('whyChoose.benefit4.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/images/wordpress-assets/tax-pro-illustration-4-5-star-rating.webp"
                alt={t('whyChoose.imageAlt')}
                width={500}
                height={400}
                className="rounded-lg shadow-lg"
                sizes="(max-width: 768px) 100vw, 500px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={servicesOverviewFAQs} />

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {t('finalCTA.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('finalCTA.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {t('finalCTA.ctaStart')} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline">
                <Link href="/contact">{t('finalCTA.ctaQuote')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
