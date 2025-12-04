'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  Search,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  CreditCard,
  Shield,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Book,
  Calculator,
  AlertCircle,
  Video,
  Headphones,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function HelpCenterPage() {
  const t = useTranslations('help');

  const helpCategories = [
    {
      icon: FileText,
      titleKey: 'filing.title',
      descKey: 'filing.description',
      articlesKey: 'filing.articles',
      color: 'text-blue-500',
    },
    {
      icon: CreditCard,
      titleKey: 'payments.title',
      descKey: 'payments.description',
      articlesKey: 'payments.articles',
      color: 'text-green-500',
    },
    {
      icon: Shield,
      titleKey: 'security.title',
      descKey: 'security.description',
      articlesKey: 'security.articles',
      color: 'text-purple-500',
    },
    {
      icon: Users,
      titleKey: 'cpas.title',
      descKey: 'cpas.description',
      articlesKey: 'cpas.articles',
      color: 'text-orange-500',
    },
    {
      icon: Calculator,
      titleKey: 'deductions.title',
      descKey: 'deductions.description',
      articlesKey: 'deductions.articles',
      color: 'text-pink-500',
    },
    {
      icon: AlertCircle,
      titleKey: 'irs.title',
      descKey: 'irs.description',
      articlesKey: 'irs.articles',
      color: 'text-red-500',
    },
  ];

  const popularArticles = [
    { titleKey: 'article1.title', viewsKey: 'article1.views' },
    { titleKey: 'article2.title', viewsKey: 'article2.views' },
    { titleKey: 'article3.title', viewsKey: 'article3.views' },
    { titleKey: 'article4.title', viewsKey: 'article4.views' },
    { titleKey: 'article5.title', viewsKey: 'article5.views' },
    { titleKey: 'article6.title', viewsKey: 'article6.views' },
  ];

  const faqSections = [
    {
      categoryKey: 'gettingStarted.category',
      questions: ['q1', 'q2', 'q3'],
      section: 'gettingStarted',
    },
    {
      categoryKey: 'paymentsRefunds.category',
      questions: ['q1', 'q2', 'q3'],
      section: 'paymentsRefunds',
    },
    {
      categoryKey: 'cpaServices.category',
      questions: ['q1', 'q2', 'q3'],
      section: 'cpaServices',
    },
    {
      categoryKey: 'securityPrivacy.category',
      questions: ['q1', 'q2', 'q3'],
      section: 'securityPrivacy',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Search */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto space-y-8"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <HelpCircle className="w-5 h-5" />
              <span className="font-semibold">{t('hero.badge')}</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold">
              {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
            </h1>

            <p className="text-xl text-muted-foreground">
              {t('hero.subtitle')}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('hero.searchPlaceholder')}
                  className="pl-14 h-16 text-lg shadow-lg"
                />
                <Button
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12"
                  variant="professional"
                >
                  {t('hero.searchButton')}
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-8">
              {[
                { icon: Book, labelKey: 'articles', color: 'text-blue-500' },
                { icon: Video, labelKey: 'videos', color: 'text-purple-500' },
                { icon: Users, labelKey: 'support', color: 'text-green-500' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-12 h-12 ${item.color} bg-primary/5 rounded-full flex items-center justify-center`}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold">{t(`stats.${item.labelKey}`)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Phone,
                titleKey: 'phone.title',
                descKey: 'phone.description',
                actionKey: 'phone.action',
                href: 'tel:+14046271015',
                color: 'text-green-500',
              },
              {
                icon: MessageCircle,
                titleKey: 'chat.title',
                descKey: 'chat.description',
                actionKey: 'chat.action',
                href: '#',
                color: 'text-blue-500',
              },
              {
                icon: Mail,
                titleKey: 'email.title',
                descKey: 'email.description',
                actionKey: 'email.action',
                href: 'mailto:taxgenius.tax@gmail.com',
                color: 'text-purple-500',
              },
              {
                icon: Video,
                titleKey: 'video.title',
                descKey: 'video.description',
                actionKey: 'video.action',
                href: '/book-appointment',
                color: 'text-orange-500',
              },
            ].map((option, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <CardContent className="pt-6 text-center">
                    <div
                      className={`w-14 h-14 ${option.color} bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <option.icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{t(`contact.${option.titleKey}`)}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t(`contact.${option.descKey}`)}</p>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={option.href}>{t(`contact.${option.actionKey}`)}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('categories.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('categories.subtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {helpCategories.map((category, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Link href={`/help/${t(`categories.${category.titleKey}`).toLowerCase().replace(/ /g, '-')}`}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-14 h-14 ${category.color} bg-primary/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                        >
                          <category.icon className="w-7 h-7" />
                        </div>
                        <Badge variant="secondary">{t(`categories.${category.articlesKey}`)}</Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {t(`categories.${category.titleKey}`)}
                      </CardTitle>
                      <CardDescription className="text-base">{t(`categories.${category.descKey}`)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                        <span>{t('categories.viewArticles')}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('popular.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('popular.subtitle')}</p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-4">
            {popularArticles.map((article, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link href={`/help/article/${i}`}>
                  <Card className="hover:shadow-lg transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                              {t(`popular.${article.titleKey}`)}
                            </h3>
                            <p className="text-sm text-muted-foreground">{t(`popular.${article.viewsKey}`)}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('faq.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('faq.subtitle')}</p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-8">
            {faqSections.map((section, sectionIdx) => (
              <motion.div
                key={sectionIdx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIdx * 0.1 }}
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  {t(`faq.${section.categoryKey}`)}
                </h3>

                <Accordion type="single" collapsible className="space-y-4">
                  {section.questions.map((q, faqIdx) => (
                    <AccordionItem
                      key={faqIdx}
                      value={`${sectionIdx}-${faqIdx}`}
                      className="bg-card rounded-lg px-6 border hover:border-primary transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline text-left">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="font-semibold">{t(`faq.${section.section}.${q}.question`)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pl-8 pt-2 leading-relaxed">
                        {t(`faq.${section.section}.${q}.answer`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Need Help CTA */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="max-w-4xl mx-auto overflow-hidden border-2">
              <div className="grid md:grid-cols-2">
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=600&q=80"
                    alt={t('cta.imageAlt')}
                    width={600}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-primary/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Headphones className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-8 md:p-12 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-3">{t('cta.title')}</h3>
                  <p className="text-muted-foreground mb-6">
                    {t('cta.subtitle')}
                  </p>

                  <div className="space-y-3">
                    <Button variant="professional" className="w-full h-12" asChild>
                      <Link href="tel:+14046271015">
                        <Phone className="mr-2 w-5 h-5" />
                        {t('cta.callButton')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full h-12">
                      <MessageCircle className="mr-2 w-5 h-5" />
                      {t('cta.chatButton')}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 pt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-success" />
                      <span>{t('cta.available')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>{t('cta.responseTime')}</span>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
