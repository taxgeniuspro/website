'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Users,
  TrendingUp,
  Shield,
  Heart,
  Lightbulb,
  Building,
  GraduationCap,
  Target,
  ArrowRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('about');
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-base px-4 py-2">
              {t('hero.badge')}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{t('stats.years')}</div>
              <p className="text-muted-foreground">{t('stats.yearsLabel')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{t('stats.clients')}</div>
              <p className="text-muted-foreground">{t('stats.clientsLabel')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{t('stats.refunds')}</div>
              <p className="text-muted-foreground">{t('stats.refundsLabel')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{t('stats.satisfaction')}</div>
              <p className="text-muted-foreground">{t('stats.satisfactionLabel')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Humble Beginnings */}
      <section className="py-20 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 lg:order-1"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10">
                <Image
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80"
                  alt={t('beginnings.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="bg-primary/90 text-primary-foreground border-0 text-sm">
                    {t('beginnings.imageBadge')}
                  </Badge>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {t('beginnings.title')}
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                <p>
                  {t('beginnings.paragraph1')}
                </p>
                <p>
                  {t('beginnings.paragraph2')}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Building Trust & Expertise */}
      <section className="py-20 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-secondary" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {t('trust.title')}
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                <p>
                  {t('trust.paragraph1')}
                </p>
                <p>
                  {t('trust.paragraph2')}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <Card className="border-2 border-secondary/20">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-8 h-8 text-secondary mx-auto mb-3" />
                    <div className="font-semibold text-foreground">{t('trust.card1Title')}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t('trust.card1Description')}</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-secondary/20">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 text-secondary mx-auto mb-3" />
                    <div className="font-semibold text-foreground">{t('trust.card2Title')}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t('trust.card2Description')}</div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-secondary/10 group">
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                  alt={t('trust.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Investing in People & Communities */}
      <section className="py-20 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 lg:order-1"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10">
                <Image
                  src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"
                  alt={t('community.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-lg p-4 border-2 border-background">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">{t('community.badgeTitle')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('community.badgeSubtitle')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {t('community.title')}
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                <p>
                  {t('community.paragraph1')}
                </p>
                <p>
                  {t('community.paragraph2')}
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-success rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t('community.list1Title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('community.list1Description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-success rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t('community.list2Title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('community.list2Description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-success rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t('community.list3Title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('community.list3Description')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Embracing Technology & Innovation */}
      <section className="py-20 lg:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {t('innovation.title')}
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                <p>
                  {t('innovation.paragraph1')}
                </p>
                <p>
                  {t('innovation.paragraph2')}
                </p>
              </div>

              <div className="mt-8">
                <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-2">
                          {t('innovation.cardTitle')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {t('innovation.cardDescription')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10">
                <Image
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
                  alt={t('innovation.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Vision Forward */}
      <section className="py-20 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                {t('vision.title')}
              </h2>
            </div>

            <Card className="border-2 border-primary/20 shadow-xl">
              <CardContent className="p-8 lg:p-12">
                <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
                  <p>
                    {t('vision.paragraph1')}
                  </p>
                  <p className="text-xl font-medium text-foreground">
                    {t('vision.paragraph2')}
                  </p>
                </div>

                <div className="mt-8 pt-8 border-t border-border">
                  <div className="relative rounded-xl overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80"
                      alt={t('vision.imageAlt')}
                      width={1200}
                      height={400}
                      className="object-cover w-full h-64"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-white font-semibold text-xl">
                        {t('vision.teamText')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24 bg-primary/5">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg" asChild>
                <Link href="/start-filing/form">
                  {t('cta.ctaStart')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg" asChild>
                <Link href="/contact">{t('cta.ctaContact')}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
