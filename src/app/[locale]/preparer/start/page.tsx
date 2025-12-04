'use client';

import TaxPreparerApplicationForm from '@/components/TaxPreparerApplicationForm';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function PreparerStartPage() {
  const t = useTranslations('preparerStart');

  const benefits = [
    {
      icon: t('benefits.cards.income.icon'),
      title: t('benefits.cards.income.title'),
      description: t('benefits.cards.income.description'),
    },
    {
      icon: t('benefits.cards.flexibility.icon'),
      title: t('benefits.cards.flexibility.title'),
      description: t('benefits.cards.flexibility.description'),
    },
    {
      icon: t('benefits.cards.stability.icon'),
      title: t('benefits.cards.stability.title'),
      description: t('benefits.cards.stability.description'),
    },
    {
      icon: t('benefits.cards.more.icon'),
      title: t('benefits.cards.more.title'),
      description: t('benefits.cards.more.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-primary text-primary-foreground py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('header.title')}</h1>
          <p className="text-xl">{t('header.description')}</p>
        </div>
      </section>

      {/* Benefits Banner */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">{t('benefits.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('benefits.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-card border rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">{benefit.icon}</div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">{benefit.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Logo Image */}
            <div className="hidden lg:block sticky top-24">
              <div className="relative h-[600px] rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/20 bg-muted flex items-center justify-center p-12">
                <Image
                  src="/images/tax-genius-logo.png"
                  alt="Tax Genius Pro - Join Our Team"
                  width={600}
                  height={800}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Right Side - Form */}
            <div>
              <TaxPreparerApplicationForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 px-4 bg-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-2xl font-bold mb-4">{t('footer.title')}</h3>
          <p className="text-lg mb-4">
            {t('footer.description')}{' '}
            <a href="tel:+14046271015" className="text-primary font-semibold">
              +1 (404) 627-1015
            </a>{' '}
            {t('footer.or')}{' '}
            <a href="mailto:taxgenius.tax@gmail.com" className="text-primary font-semibold">
              taxgenius.tax@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
