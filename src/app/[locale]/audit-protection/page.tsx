'use client';

import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle,
  Phone,
  ArrowRight,
  FileText,
  Users,
  AlertTriangle,
  Clock,
  Award,
  Mail,
  BookOpen,
  TrendingUp,
  Lock,
  Scale,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { auditProtectionFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';
import { useTranslations } from 'next-intl';

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const duration = 2000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function AuditProtectionPage() {
  const t = useTranslations('auditProtection');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <Badge className="bg-primary/10 text-primary px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                {t('hero.badge')}
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold">
                {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="professional" size="lg" asChild>
                  <Link href="/start-filing/form">{t('hero.ctaProtect')}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="tel:+14046271015">
                    <Phone className="mr-2 w-5 h-5" />
                    {t('hero.ctaPhone')}
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                {[
                  { icon: Shield, label: t('hero.feature1') },
                  { icon: Users, label: t('hero.feature2') },
                  { icon: Award, label: t('hero.feature3') },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <item.icon className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80"
                  alt={t('hero.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                {/* Floating shield badge */}
                <motion.div
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 1, duration: 0.5, type: 'spring' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-2xl border-8 border-background">
                    <Shield className="w-16 h-16 text-primary-foreground" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { value: 98, suffix: '%', label: t('stats.auditsResolved') },
              { value: 5000, suffix: '+', label: t('stats.clientsProtected') },
              { value: 3, suffix: t('stats.days'), label: t('stats.avgResponseTime') },
              { value: 0, suffix: '$', label: t('stats.outOfPocketCosts') },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('coverage.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('coverage.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Mail,
                title: t('coverage.correspondence.title'),
                desc: t('coverage.correspondence.description'),
                color: 'text-blue-500',
              },
              {
                icon: FileText,
                title: t('coverage.office.title'),
                desc: t('coverage.office.description'),
                color: 'text-green-500',
              },
              {
                icon: BookOpen,
                title: t('coverage.field.title'),
                desc: t('coverage.field.description'),
                color: 'text-purple-500',
              },
              {
                icon: AlertTriangle,
                title: t('coverage.cp2000.title'),
                desc: t('coverage.cp2000.description'),
                color: 'text-orange-500',
              },
              {
                icon: Clock,
                title: t('coverage.amended.title'),
                desc: t('coverage.amended.description'),
                color: 'text-pink-500',
              },
              {
                icon: Scale,
                title: t('coverage.appeals.title'),
                desc: t('coverage.appeals.description'),
                color: 'text-indigo-500',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.05, rotate: 2 }}
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 ${item.color} bg-primary/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <item.icon className="w-7 h-7" />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.desc}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-success">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('coverage.fullyCovered')}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Process Timeline */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('process.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('process.subtitle')}</p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary/20 hidden md:block" />

              <div className="space-y-8">
                {[
                  {
                    step: '1',
                    title: t('process.step1.title'),
                    desc: t('process.step1.description'),
                    icon: Mail,
                  },
                  {
                    step: '2',
                    title: t('process.step2.title'),
                    desc: t('process.step2.description'),
                    icon: BookOpen,
                  },
                  {
                    step: '3',
                    title: t('process.step3.title'),
                    desc: t('process.step3.description'),
                    icon: FileText,
                  },
                  {
                    step: '4',
                    title: t('process.step4.title'),
                    desc: t('process.step4.description'),
                    icon: Users,
                  },
                  {
                    step: '5',
                    title: t('process.step5.title'),
                    desc: t('process.step5.description'),
                    icon: CheckCircle,
                  },
                ].map((phase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                  >
                    <Card className="hover:shadow-lg transition-all group relative">
                      <CardContent className="p-6 md:pl-24">
                        {/* Step number badge */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg group-hover:scale-110 transition-transform z-10">
                          {phase.step}
                        </div>

                        <div className="flex gap-4 items-start">
                          <div className="flex-shrink-0 md:ml-0 ml-16">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <phase.icon className="w-6 h-6 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">{phase.title}</h3>
                            <p className="text-muted-foreground">{phase.desc}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Peace of Mind Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Image
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=700&q=80"
                alt={t('peaceOfMind.imageAlt')}
                width={700}
                height={500}
                className="rounded-lg shadow-xl object-cover"
              />
            </motion.div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('peaceOfMind.title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('peaceOfMind.subtitle')}
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: Lock,
                    title: t('peaceOfMind.benefit1.title'),
                    desc: t('peaceOfMind.benefit1.description'),
                  },
                  {
                    icon: Users,
                    title: t('peaceOfMind.benefit2.title'),
                    desc: t('peaceOfMind.benefit2.description'),
                  },
                  {
                    icon: Clock,
                    title: t('peaceOfMind.benefit3.title'),
                    desc: t('peaceOfMind.benefit3.description'),
                  },
                  {
                    icon: TrendingUp,
                    title: t('peaceOfMind.benefit4.title'),
                    desc: t('peaceOfMind.benefit4.description'),
                  },
                ].map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                        <benefit.icon className="w-6 h-6 text-success" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="pt-4">
                <Button variant="professional" size="lg" asChild>
                  <Link href="/start-filing/form">
                    {t('peaceOfMind.ctaProtect')} <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={auditProtectionFAQs} />

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold">{t('finalCta.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('finalCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">
                  {t('finalCta.ctaStart')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="tel:+14046271015">
                  <Phone className="mr-2 w-5 h-5" />
                  {t('finalCta.ctaPhone')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
