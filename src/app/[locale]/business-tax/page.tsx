'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  TrendingUp,
  FileText,
  Users,
  Shield,
  Calculator,
  ArrowRight,
  CheckCircle,
  Phone,
  Briefcase,
  PieChart,
  DollarSign,
  Award,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { ServiceFAQSection } from '@/components/services/ServiceFAQSection';
import { businessTaxFAQs } from '@/lib/seo-llm/1-core-seo/data/service-faqs';
import { useTranslations } from 'next-intl';

export default function BusinessTaxPage() {
  const t = useTranslations('businessTax');
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <Badge className="bg-primary/10 text-primary px-4 py-2">
                <Building2 className="w-4 h-4 mr-2" />
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
                  <Link href="/start-filing/form">{t('hero.ctaConsultation')}</Link>
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
                  { icon: CheckCircle, text: t('hero.stat1') },
                  { icon: Award, text: t('hero.stat2') },
                  { icon: Shield, text: t('hero.stat3') },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="w-5 h-5 text-success" />
                    <span>{item.text}</span>
                  </div>
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
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80"
                  alt={t('hero.imageAlt')}
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border-2 border-background rounded-lg shadow-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{t('hero.savingsAmount')}</p>
                      <p className="text-sm text-muted-foreground">{t('hero.savingsLabel')}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Business Types Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('businessTypes.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('businessTypes.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Users,
                title: t('businessTypes.soleProprietor.title'),
                desc: t('businessTypes.soleProprietor.description'),
                color: 'text-blue-500',
                delay: 0,
              },
              {
                icon: Briefcase,
                title: t('businessTypes.llc.title'),
                desc: t('businessTypes.llc.description'),
                color: 'text-green-500',
                delay: 0.1,
              },
              {
                icon: Building2,
                title: t('businessTypes.sCorp.title'),
                desc: t('businessTypes.sCorp.description'),
                color: 'text-purple-500',
                delay: 0.2,
              },
              {
                icon: TrendingUp,
                title: t('businessTypes.cCorp.title'),
                desc: t('businessTypes.cCorp.description'),
                color: 'text-orange-500',
                delay: 0.3,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <Card className="h-full hover:shadow-lg transition-all cursor-pointer group">
                  <CardHeader>
                    <div
                      className={`w-16 h-16 ${item.color} bg-primary/5 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <item.icon className="w-8 h-8" />
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

      {/* Services Included */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Image
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=80"
                alt={t('servicesIncluded.imageAlt')}
                width={700}
                height={500}
                className="rounded-lg shadow-xl object-cover"
              />
            </motion.div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('servicesIncluded.title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('servicesIncluded.subtitle')}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: FileText,
                    title: t('servicesIncluded.service1Title'),
                    desc: t('servicesIncluded.service1Description'),
                  },
                  {
                    icon: Calculator,
                    title: t('servicesIncluded.service2Title'),
                    desc: t('servicesIncluded.service2Description'),
                  },
                  {
                    icon: PieChart,
                    title: t('servicesIncluded.service3Title'),
                    desc: t('servicesIncluded.service3Description'),
                  },
                  {
                    icon: Shield,
                    title: t('servicesIncluded.service4Title'),
                    desc: t('servicesIncluded.service4Description'),
                  },
                  {
                    icon: DollarSign,
                    title: t('servicesIncluded.service5Title'),
                    desc: t('servicesIncluded.service5Description'),
                  },
                  {
                    icon: Clock,
                    title: t('servicesIncluded.service6Title'),
                    desc: t('servicesIncluded.service6Description'),
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex gap-4 items-start group"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Specializations */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('industryExpertise.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('industryExpertise.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: t('industryExpertise.ecommerce'),
                image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
              },
              {
                name: t('industryExpertise.professionalServices'),
                image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80',
              },
              {
                name: t('industryExpertise.realEstate'),
                image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
              },
              {
                name: t('industryExpertise.healthcare'),
                image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
              },
              {
                name: t('industryExpertise.construction'),
                image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80',
              },
              {
                name: t('industryExpertise.hospitality'),
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
              },
            ].map((industry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="overflow-hidden cursor-pointer group h-full">
                  <div className="relative h-48">
                    <Image
                      src={industry.image}
                      alt={industry.name}
                      width={600}
                      height={400}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold text-lg">{industry.name}</h3>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('pricing.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: t('pricing.soleProprietor.name'),
                price: t('pricing.soleProprietor.price'),
                features: [
                  t('pricing.soleProprietor.feature1'),
                  t('pricing.soleProprietor.feature2'),
                  t('pricing.soleProprietor.feature3'),
                  t('pricing.soleProprietor.feature4'),
                ],
                popular: false,
              },
              {
                name: t('pricing.llcSCorp.name'),
                price: t('pricing.llcSCorp.price'),
                features: [
                  t('pricing.llcSCorp.feature1'),
                  t('pricing.llcSCorp.feature2'),
                  t('pricing.llcSCorp.feature3'),
                  t('pricing.llcSCorp.feature4'),
                  t('pricing.llcSCorp.feature5'),
                ],
                popular: true,
              },
              {
                name: t('pricing.cCorp.name'),
                price: t('pricing.cCorp.price'),
                features: [
                  t('pricing.cCorp.feature1'),
                  t('pricing.cCorp.feature2'),
                  t('pricing.cCorp.feature3'),
                  t('pricing.cCorp.feature4'),
                  t('pricing.cCorp.feature5'),
                ],
                popular: false,
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
                  className={`h-full ${plan.popular ? 'border-2 border-primary shadow-xl' : ''}`}
                >
                  <CardHeader>
                    {plan.popular && (
                      <Badge className="w-fit mb-2 bg-primary text-primary-foreground">
                        {t('pricing.llcSCorp.popularBadge')}
                      </Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="text-4xl font-bold text-primary mt-4">{plan.price}</div>
                    <p className="text-sm text-muted-foreground">{t('pricing.soleProprietor.startingPrice')}</p>
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
                      <Link href="/start-filing/form">{t('pricing.ctaGetStarted')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ServiceFAQSection faqs={businessTaxFAQs} />

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-3xl lg:text-4xl font-bold">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing/form">
                  {t('cta.ctaConsultation')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="tel:+14046271015">
                  <Phone className="mr-2 w-5 h-5" />
                  {t('cta.ctaCall')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
