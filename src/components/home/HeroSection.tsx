'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Award, Users, Phone, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AnimatedCounter from '@/components/AnimatedCounter';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Trust Badges Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-semibold bg-primary/10 text-primary border-primary/20"
              >
                <Shield className="w-4 h-4 mr-2" />
                {t('irsAuthorized')}
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                <Award className="w-4 h-4 mr-2" />
                {t('bbbRated')}
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                <Users className="w-4 h-4 mr-2" />
                {t('yearsExperience')}
              </Badge>
            </div>

            {/* Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-foreground">
                {t('title')}
                <br />
                <span className="text-primary">{t('titleHighlight')}</span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">{t('ctaFile')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/book-appointment">{t('ctaSchedule')}</Link>
              </Button>
            </div>

            {/* Small Trust Text */}
            <p className="text-sm text-muted-foreground">
              {t('helpText')}{' '}
              <Link href="tel:+14046271015" className="hover:text-primary transition-colors">
                (404) 627-1015
              </Link>
            </p>
          </motion.div>

          {/* Right Column - Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80"
                alt={t('imageAlt')}
                width={800}
                height={600}
                className="object-cover w-full h-full"
              />
              {/* Floating Stats Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm border-2 border-background rounded-lg shadow-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={50000} suffix="+" />
                    </p>
                    <p className="text-sm text-muted-foreground">{t('happyClients')}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
