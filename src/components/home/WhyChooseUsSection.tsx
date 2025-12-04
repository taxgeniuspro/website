'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Award, DollarSign, Phone, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function WhyChooseUsSection() {
  const t = useTranslations('home.whyChooseUs');

  const benefits = [
    {
      icon: Award,
      titleKey: 'benefit1.title',
      descriptionKey: 'benefit1.description',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      icon: DollarSign,
      titleKey: 'benefit2.title',
      descriptionKey: 'benefit2.description',
      bgColor: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      icon: Phone,
      titleKey: 'benefit3.title',
      descriptionKey: 'benefit3.description',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      icon: Shield,
      titleKey: 'benefit4.title',
      descriptionKey: 'benefit4.description',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
    },
  ];
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold">{t('sectionTitle')}</h2>
              <p className="text-lg text-muted-foreground">
                {t('sectionSubtitle')}
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 ${benefit.bgColor} rounded-full flex items-center justify-center`}
                    >
                      <benefit.icon className={`w-6 h-6 ${benefit.iconColor}`} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t(benefit.titleKey)}</h3>
                    <p className="text-muted-foreground leading-relaxed">{t(benefit.descriptionKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">{t('ctaFile')}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">{t('ctaLearnMore')}</Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Large Feature Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative rounded-lg overflow-hidden shadow-2xl group">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                alt={t('imageAlt')}
                width={800}
                height={600}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Overlay Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-6 -left-6 bg-card border-2 border-background rounded-lg shadow-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{t('badgeTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('badgeSubtitle')}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
