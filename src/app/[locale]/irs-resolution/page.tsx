'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Shield,
  CheckCircle,
  Phone,
  ArrowRight,
  FileText,
  Scale,
  CreditCard,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  Ban,
  Users,
  Zap,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { irsResolutionFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';
import { useTranslations } from 'next-intl';

export default function IRSResolutionPage() {
  const t = useTranslations('irsResolution');
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Urgency */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-orange-500/10 via-background to-red-500/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 px-4 py-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                {t('hero.badge')}
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold">
                {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="professional" size="lg" asChild className="relative">
                  <Link href="/start-filing/form">
                    <Zap className="mr-2 w-5 h-5" />
                    {t('hero.ctaImmediate')}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="tel:+14046271015">
                    <Phone className="mr-2 w-5 h-5" />
                    {t('hero.ctaPhone')}
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  { icon: Clock, text: t('hero.features.response'), color: 'text-orange-500' },
                  { icon: Award, text: t('hero.features.licensed'), color: 'text-green-500' },
                  { icon: Shield, text: t('hero.features.stopCollections'), color: 'text-blue-500' },
                  { icon: CheckCircle, text: t('hero.features.successRate'), color: 'text-purple-500' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                    className="flex items-center gap-2"
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-sm font-semibold">{item.text}</span>
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
                  src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80"
                  alt={t('hero.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                {/* Urgent badge overlay */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute top-4 left-4 bg-orange-500 text-white rounded-lg shadow-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t('hero.urgentBadge')}</p>
                      <p className="text-xs">{t('hero.urgentMessage')}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problems We Solve */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('problemsWeResolve.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('problemsWeResolve.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Ban,
                title: t('problemsWeResolve.taxLiens.title'),
                desc: t('problemsWeResolve.taxLiens.description'),
                severity: 'high',
                color: 'text-red-500',
              },
              {
                icon: AlertTriangle,
                title: t('problemsWeResolve.bankLevies.title'),
                desc: t('problemsWeResolve.bankLevies.description'),
                severity: 'high',
                color: 'text-orange-500',
              },
              {
                icon: FileText,
                title: t('problemsWeResolve.unfiledReturns.title'),
                desc: t('problemsWeResolve.unfiledReturns.description'),
                severity: 'medium',
                color: 'text-yellow-500',
              },
              {
                icon: DollarSign,
                title: t('problemsWeResolve.backTaxes.title'),
                desc: t('problemsWeResolve.backTaxes.description'),
                severity: 'medium',
                color: 'text-blue-500',
              },
              {
                icon: CreditCard,
                title: t('problemsWeResolve.offerInCompromise.title'),
                desc: t('problemsWeResolve.offerInCompromise.description'),
                severity: 'medium',
                color: 'text-green-500',
              },
              {
                icon: TrendingDown,
                title: t('problemsWeResolve.penaltyAbatement.title'),
                desc: t('problemsWeResolve.penaltyAbatement.description'),
                severity: 'low',
                color: 'text-purple-500',
              },
            ].map((problem, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <Card
                  className={`h-full hover:shadow-xl transition-all cursor-pointer group ${problem.severity === 'high' ? 'border-red-500/20' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-16 h-16 ${problem.color} bg-primary/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <problem.icon className="w-8 h-8" />
                      </div>
                      {problem.severity === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          {t('problemsWeResolve.taxLiens.badge')}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{problem.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{problem.desc}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('problemsWeResolve.weCanHelp')}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resolution Process */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('resolutionProcess.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('resolutionProcess.subtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {[
              {
                step: '1',
                title: t('resolutionProcess.step1.title'),
                desc: t('resolutionProcess.step1.description'),
                icon: AlertCircle,
                color: 'bg-red-500',
              },
              {
                step: '2',
                title: t('resolutionProcess.step2.title'),
                desc: t('resolutionProcess.step2.description'),
                icon: Shield,
                color: 'bg-orange-500',
              },
              {
                step: '3',
                title: t('resolutionProcess.step3.title'),
                desc: t('resolutionProcess.step3.description'),
                icon: FileText,
                color: 'bg-blue-500',
              },
              {
                step: '4',
                title: t('resolutionProcess.step4.title'),
                desc: t('resolutionProcess.step4.description'),
                icon: Scale,
                color: 'bg-purple-500',
              },
              {
                step: '5',
                title: t('resolutionProcess.step5.title'),
                desc: t('resolutionProcess.step5.description'),
                icon: CheckCircle,
                color: 'bg-green-500',
              },
            ].map((phase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <Card className="h-full hover:shadow-lg transition-all text-center group cursor-pointer">
                  <CardContent className="pt-6">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className={`w-16 h-16 ${phase.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white`}
                    >
                      <phase.icon className="w-8 h-8" />
                    </motion.div>
                    <Badge variant="secondary" className="mb-3">
                      {t('resolutionProcess.stepLabel')} {phase.step}
                    </Badge>
                    <h3 className="font-bold text-lg mb-2">{phase.title}</h3>
                    <p className="text-sm text-muted-foreground">{phase.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('successStories.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('successStories.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
                name: t('successStories.story1.name'),
                situation: t('successStories.story1.situation'),
                result: t('successStories.story1.result'),
                savings: t('successStories.story1.savings'),
                timeline: t('successStories.story1.timeline'),
              },
              {
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
                name: t('successStories.story2.name'),
                situation: t('successStories.story2.situation'),
                result: t('successStories.story2.result'),
                savings: t('successStories.story2.savings'),
                timeline: t('successStories.story2.timeline'),
              },
              {
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
                name: t('successStories.story3.name'),
                situation: t('successStories.story3.situation'),
                result: t('successStories.story3.result'),
                savings: t('successStories.story3.savings'),
                timeline: t('successStories.story3.timeline'),
              },
            ].map((story, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="hover:shadow-xl transition-all h-full">
                  <CardContent className="pt-6 text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-success">
                      <Image
                        src={story.image}
                        alt={story.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <h3 className="font-bold text-xl mb-2">{story.name}</h3>
                    <Badge variant="destructive" className="mb-4">
                      {story.situation}
                    </Badge>
                    <div className="bg-success/10 rounded-lg p-4 mb-4">
                      <p className="text-success font-semibold text-lg mb-1">✓ {t('successStories.resolved')}</p>
                      <p className="text-sm text-muted-foreground">{story.result}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('successStories.savingsLabel')}</p>
                        <p className="font-bold text-primary">{story.savings}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('successStories.timelineLabel')}</p>
                        <p className="font-bold">{story.timeline}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency CTA */}
      <section className="py-24 bg-muted relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-6 py-3 rounded-full border border-orange-500/20">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-semibold">{t('urgencyCTA.badge')}</span>
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold">{t('urgencyCTA.title')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('urgencyCTA.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">
                  <Zap className="mr-2 w-5 h-5" />
                  {t('urgencyCTA.ctaEmergency')}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-background">
                <Link href="tel:+14046271015">
                  <Phone className="mr-2 w-5 h-5" />
                  {t('urgencyCTA.ctaCall')}
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 justify-center pt-8 text-sm">
              {[
                { icon: Clock, text: t('urgencyCTA.features.response') },
                { icon: Shield, text: t('urgencyCTA.features.stopCollections') },
                { icon: Users, text: t('urgencyCTA.features.licensedPros') },
                { icon: CheckCircle, text: t('urgencyCTA.features.freeConsultation') },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <item.icon className="w-5 h-5 text-success" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80"
                alt={t('whyChooseUs.imageAlt')}
                width={700}
                height={500}
                className="rounded-lg shadow-xl object-cover"
              />
            </motion.div>

            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                {t('whyChooseUs.title')}
              </h2>
              {[
                {
                  icon: Award,
                  title: t('whyChooseUs.reason1.title'),
                  desc: t('whyChooseUs.reason1.description'),
                },
                {
                  icon: Scale,
                  title: t('whyChooseUs.reason2.title'),
                  desc: t('whyChooseUs.reason2.description'),
                },
                {
                  icon: Clock,
                  title: t('whyChooseUs.reason3.title'),
                  desc: t('whyChooseUs.reason3.description'),
                },
                {
                  icon: DollarSign,
                  title: t('whyChooseUs.reason4.title'),
                  desc: t('whyChooseUs.reason4.description'),
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={irsResolutionFAQs} />
    </div>
  );
}
