'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Home,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Shield,
  TrendingUp,
  Clock,
  Award,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { personalTaxFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';

export default function PersonalTaxFilingPage() {
  const t = useTranslations('personalTaxFiling');
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-4 bg-primary/10 text-primary">{t('hero.badge')}</Badge>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/start-filing/form">
                  {t('hero.ctaStart')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/book-appointment">
                  <Phone className="mr-2 w-5 h-5" />
                  {t('hero.ctaSchedule')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{t('whatsIncluded.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: FileText, title: t('whatsIncluded.service1Title'), desc: t('whatsIncluded.service1Description') },
              { icon: Home, title: t('whatsIncluded.service2Title'), desc: t('whatsIncluded.service2Description') },
              { icon: Users, title: t('whatsIncluded.service3Title'), desc: t('whatsIncluded.service3Description') },
              { icon: DollarSign, title: t('whatsIncluded.service4Title'), desc: t('whatsIncluded.service4Description') },
              { icon: TrendingUp, title: t('whatsIncluded.service5Title'), desc: t('whatsIncluded.service5Description') },
              { icon: Shield, title: t('whatsIncluded.service6Title'), desc: t('whatsIncluded.service6Description') },
            ].map((item, i) => (
              <Card key={i} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <item.icon className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">{t('pricing.title')}</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">{t('pricing.basicLabel')}</p>
                  <p className="text-4xl font-bold text-primary mb-2">{t('pricing.basicPrice')}</p>
                  <p className="text-sm">{t('pricing.basicDescription')}</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary">
                <CardContent className="pt-6">
                  <Badge className="mb-2">{t('pricing.standardBadge')}</Badge>
                  <p className="text-sm text-muted-foreground mb-2">{t('pricing.standardLabel')}</p>
                  <p className="text-4xl font-bold text-primary mb-2">{t('pricing.standardPrice')}</p>
                  <p className="text-sm">{t('pricing.standardDescription')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">{t('pricing.complexLabel')}</p>
                  <p className="text-4xl font-bold text-primary mb-2">{t('pricing.complexPrice')}</p>
                  <p className="text-sm">{t('pricing.complexDescription')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={personalTaxFAQs} />

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">{t('cta.title')}</h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t('cta.subtitle')}
            </p>
            <Button size="lg" asChild>
              <Link href="/start-filing/form">
                {t('cta.ctaButton')} <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
