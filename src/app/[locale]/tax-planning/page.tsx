'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Calendar,
  Target,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  Phone,
  PiggyBank,
  FileText,
  BarChart3,
  Award,
  Lightbulb,
  Clock,
  DollarSign,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { taxPlanningFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';

export default function TaxPlanningPage() {
  const t = useTranslations('taxPlanning');
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <Badge className="bg-primary/10 text-primary px-4 py-2">
                <Target className="w-4 h-4 mr-2" />
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
                  <Link href="/start-filing/form">{t('hero.ctaButton')}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="tel:+14046271015">
                    <Phone className="mr-2 w-5 h-5" />
                    {t('hero.ctaPhone')}
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                {[
                  { icon: Clock, text: t('hero.feature1') },
                  { icon: DollarSign, text: t('hero.feature2') },
                  { icon: Award, text: t('hero.feature3') },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <item.icon className="w-5 h-5 text-success" />
                    <span>{item.text}</span>
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
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
                  alt={t('hero.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5, type: 'spring' }}
                  className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm border-2 border-background rounded-lg shadow-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{t('hero.statNumber')}</p>
                      <p className="text-sm text-muted-foreground">{t('hero.statLabel')}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Plan Year-Round */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('whyPlan.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('whyPlan.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Calendar,
                title: t('whyPlan.card1Title'),
                desc: t('whyPlan.card1Description'),
                delay: 0,
              },
              {
                icon: Lightbulb,
                title: t('whyPlan.card2Title'),
                desc: t('whyPlan.card2Description'),
                delay: 0.1,
              },
              {
                icon: DollarSign,
                title: t('whyPlan.card3Title'),
                desc: t('whyPlan.card3Description'),
                delay: 0.2,
              },
              {
                icon: Shield,
                title: t('whyPlan.card4Title'),
                desc: t('whyPlan.card4Description'),
                delay: 0.3,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ y: -10, scale: 1.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all text-center group cursor-pointer">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <item.icon className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planning Process Timeline */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('process.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('process.subtitle')}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-8">
            {[
              {
                step: t('process.step1'),
                title: t('process.step1Title'),
                desc: t('process.step1Description'),
                icon: Users,
                color: 'bg-blue-500',
              },
              {
                step: t('process.step2'),
                title: t('process.step2Title'),
                desc: t('process.step2Description'),
                icon: Target,
                color: 'bg-green-500',
              },
              {
                step: t('process.step3'),
                title: t('process.step3Title'),
                desc: t('process.step3Description'),
                icon: CheckCircle,
                color: 'bg-purple-500',
              },
              {
                step: t('process.step4'),
                title: t('process.step4Title'),
                desc: t('process.step4Description'),
                icon: BarChart3,
                color: 'bg-orange-500',
              },
            ].map((phase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Card className="hover:shadow-xl transition-all group">
                  <CardContent className="p-8">
                    <div className="flex gap-6 items-start">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-16 h-16 ${phase.color} rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
                        >
                          <phase.icon className="w-8 h-8" />
                        </div>
                        <div className="mt-2 text-center">
                          <Badge variant="secondary" className="font-bold">
                            Step {phase.step}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{phase.title}</h3>
                        <p className="text-muted-foreground text-lg">{phase.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planning Services */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('services.title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('services.subtitle')}
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: PiggyBank,
                    title: t('services.service1Title'),
                    desc: t('services.service1Description'),
                  },
                  {
                    icon: Home,
                    title: t('services.service2Title'),
                    desc: t('services.service2Description'),
                  },
                  {
                    icon: TrendingUp,
                    title: t('services.service3Title'),
                    desc: t('services.service3Description'),
                  },
                  {
                    icon: Users,
                    title: t('services.service4Title'),
                    desc: t('services.service4Description'),
                  },
                  {
                    icon: FileText,
                    title: t('services.service5Title'),
                    desc: t('services.service5Description'),
                  },
                  {
                    icon: Shield,
                    title: t('services.service6Title'),
                    desc: t('services.service6Description'),
                  },
                ].map((service, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex gap-4 items-start p-4 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <service.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                      <p className="text-muted-foreground text-sm">{service.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative rounded-lg overflow-hidden shadow-2xl group">
                <Image
                  src="https://images.unsplash.com/photo-1579532536935-619928decd08?w=700&q=80"
                  alt={t('services.imageAlt')}
                  width={700}
                  height={900}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: t('pricing.essentials.name'),
                price: t('pricing.essentials.price'),
                period: t('pricing.essentials.period'),
                features: [
                  t('pricing.essentials.feature1'),
                  t('pricing.essentials.feature2'),
                  t('pricing.essentials.feature3'),
                  t('pricing.essentials.feature4'),
                ],
                cta: t('pricing.essentials.cta'),
              },
              {
                name: t('pricing.professional.name'),
                price: t('pricing.professional.price'),
                period: t('pricing.professional.period'),
                features: [
                  t('pricing.professional.feature1'),
                  t('pricing.professional.feature2'),
                  t('pricing.professional.feature3'),
                  t('pricing.professional.feature4'),
                  t('pricing.professional.feature5'),
                ],
                popular: true,
                cta: t('pricing.professional.cta'),
                badge: t('pricing.professional.badge'),
              },
              {
                name: t('pricing.executive.name'),
                price: t('pricing.executive.price'),
                period: t('pricing.executive.period'),
                features: [
                  t('pricing.executive.feature1'),
                  t('pricing.executive.feature2'),
                  t('pricing.executive.feature3'),
                  t('pricing.executive.feature4'),
                  t('pricing.executive.feature5'),
                  t('pricing.executive.feature6'),
                ],
                cta: t('pricing.executive.cta'),
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -10 }}
              >
                <Card
                  className={`h-full ${plan.popular ? 'border-2 border-primary shadow-xl scale-105' : ''}`}
                >
                  <CardHeader>
                    {plan.popular && plan.badge && (
                      <Badge className="w-fit mb-2 bg-primary text-primary-foreground">
                        {plan.badge}
                      </Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.popular ? 'professional' : 'outline'}
                      className="w-full"
                      asChild
                    >
                      <Link href="/start-filing/form">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground">
              {t('pricing.footnote')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={taxPlanningFAQs} />

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-3xl lg:text-4xl font-bold">{t('cta.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">
                  {t('cta.ctaButton')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="tel:+14046271015">
                  <Phone className="mr-2 w-5 h-5" />
                  {t('cta.ctaPhone')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
