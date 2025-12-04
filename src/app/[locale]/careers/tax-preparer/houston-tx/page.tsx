'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Home,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  MapPin,
  Phone,
  MessageSquare,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import JobPostingSchema from '@/components/seo/JobPostingSchema';
import TaxPreparerFAQ from '@/components/seo/TaxPreparerFAQ';
import TaxPreparerBreadcrumb from '@/components/seo/TaxPreparerBreadcrumb';

export default function HoustonTaxPreparerPage() {
  const [income, setIncome] = useState(0);
  const pathname = usePathname();
  const isSpanish = pathname?.startsWith('/es');

  // Translation hooks
  const t = useTranslations('taxPreparerCities.shared');
  const city = useTranslations('taxPreparerCities.houston');

  // Helper function to replace template variables
  const replaceVars = (text: string): string => {
    return text
      .replace(/{city}/g, city('city'))
      .replace(/{state}/g, city('state'))
      .replace(/{stateCode}/g, city('stateCode'))
      .replace(/{population}/g, city('population'))
      .replace(/{income}/g, city('targetIncome'))
      .replace(/{neighborhoods}/g, city('neighborhoods.hero'))
      .replace(/{neighborhood1}/g, city('localContent.neighborhoodReferences.neighborhood1'))
      .replace(/{neighborhood2}/g, city('localContent.neighborhoodReferences.neighborhood2'))
      .replace(/{neighborhood3}/g, city('localContent.neighborhoodReferences.neighborhood3'))
      .replace(/{neighborhood4}/g, city('localContent.neighborhoodReferences.neighborhood4'))
      .replace(/{localArea}/g, city('localContent.localArea'))
      .replace(/{localActivity}/g, city('localContent.localActivity'))
      .replace(/{strongPopulation}/g, `<strong>${city('population')}+</strong>`)
      .replace(/{strongSeasonalPeaks}/g, `<strong>${city('localContent.marketHighlight')}</strong>`)
      .replace(/{strongYearRound}/g, `<strong>${city('localContent.marketHighlight2')}</strong>`)
      .replace(/{strongIncome1}/g, '<strong>$75,000+ annually</strong>')
      .replace(/{strongIncome2}/g, '<strong>$150,000</strong>')
      .replace(/{strongNeighborhoods}/g, `<strong>${city('neighborhoods.main')}</strong>`)
      .replace(/{strongSpots}/g, '<strong>training spots</strong>')
      .replace(/{strongJoin}/g, `<strong>Join Tax Genius Pro in ${city('city')}</strong>`)
      .replace(/{strongCertified}/g, '<strong>certified tax preparer in just 4-6 weeks</strong>')
      .replace(/{strongSimple}/g, '<strong>$150-$250</strong>')
      .replace(/{strongComplex}/g, '<strong>$500-$2,000+</strong>');
  };

  useEffect(() => {
    const target = parseInt(city('targetIncome'));
    const duration = 2500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setIncome(target);
        clearInterval(timer);
      } else {
        setIncome(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [city]);

  const neighborhoods = [
    city('localContent.neighborhoodReferences.neighborhood1'),
    city('localContent.neighborhoodReferences.neighborhood2'),
    city('localContent.neighborhoodReferences.neighborhood3'),
    city('localContent.neighborhoodReferences.neighborhood4'),
    'Montrose',
    'Sugar Land'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <JobPostingSchema city={city('city')} state={city('state')} stateCode={city('stateCode')} />
      <TaxPreparerBreadcrumb
        city={city('city')}
        stateCode={city('stateCode')}
        citySlug="houston-tx"
        locale={isSpanish ? 'es' : 'en'}
      />

      {/* Branding Section */}
      <section className="bg-background py-8 px-6 border-b">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Image
              src="/images/owliver-owl-icon.png"
              alt={t('branding.owlAlt')}
              width={120}
              height={120}
              className="mx-auto mb-4"
              priority
            />
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              {t('branding.joinTheTeam')}
            </h2>
          </motion.div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 text-lg px-4 py-2" variant="secondary">
                <MapPin className="w-4 h-4 mr-2 inline" />
                {replaceVars(t('hero.badge'))}
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {replaceVars(t('hero.titlePart1'))} <motion.span
                className="text-primary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.5 }}
              >
                ${income.toLocaleString()}+
              </motion.span> {t('hero.titlePart2')}
            </motion.h1>

            <motion.p
              className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {replaceVars(t('hero.subtitle'))}
            </motion.p>

            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {t('hero.highlights')}
            </motion.p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/preparer/start">
                  {t('hero.cta.primary')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
                <Link href="/preparer/start">
                  {t('hero.cta.secondary')}
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+14046271015" className="hover:text-primary">{t('hero.contact.phone')}</a>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <a href="sms:+14046271015" className="hover:text-primary">{t('hero.contact.text')}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden h-full">
                <div className="relative h-64 w-full bg-muted/20 p-4">
                  <Image
                    src="/golden-eggs.png"
                    alt={replaceVars(t('keyBenefits.benefit1.imageAlt'))}
                    fill
                    className="object-contain p-4"
                  />
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-2xl font-bold mb-2">{t('keyBenefits.benefit1.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('keyBenefits.benefit1.description')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden h-full">
                <div className="relative h-64 w-full bg-muted/20 p-4">
                  <Image
                    src={isSpanish ? "/work-from-home-es.png" : "/work-from-home.png"}
                    alt={replaceVars(t('keyBenefits.benefit2.imageAlt'))}
                    fill
                    className="object-contain p-4"
                  />
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-2xl font-bold mb-2">{t('keyBenefits.benefit2.title')}</h3>
                  <p className="text-muted-foreground">
                    {replaceVars(t('keyBenefits.benefit2.description'))}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden h-full">
                <div className="relative h-64 w-full bg-muted/20 p-4">
                  <Image
                    src={isSpanish ? "/flexible-hours-es.png" : "/employee-smile.webp"}
                    alt={replaceVars(t('keyBenefits.benefit3.imageAlt'))}
                    fill
                    className="object-contain p-4"
                  />
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-2xl font-bold mb-2">{t('keyBenefits.benefit3.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('keyBenefits.benefit3.description')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-6">{replaceVars(t('breakFreeSection.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{
              __html: replaceVars(t('breakFreeSection.paragraph1'))
                .replace('{companyLink}', `<a href="/preparer/join" class="text-primary hover:underline font-semibold">${t('breakFreeSection.companyLinkText')}</a>`)
            }} />

            <div className="bg-primary/10 border-l-4 border-primary p-6 my-8 rounded">
              <h3 className="text-2xl font-bold mb-4">{t('breakFreeSection.calloutBox.title')}</h3>
              <p className="mb-4">{t('breakFreeSection.calloutBox.intro')}</p>
              <ul className="space-y-2">
                {['item1', 'item2', 'item3', 'item4', 'item5'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>
                      <strong>{t(`breakFreeSection.calloutBox.items.${item}.strong`)}</strong> {t(`breakFreeSection.calloutBox.items.${item}.text`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <h2 className="text-3xl font-bold mb-6 mt-12">{replaceVars(t('marketSection.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{
              __html: replaceVars(t('marketSection.description'))
            }} />

            <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary my-8">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-8 h-8" />
                  {replaceVars(t('marketSection.opportunityCard.title'))}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {['population', 'yearRound', 'bilingual', 'remote'].map((metric) => (
                    <div key={metric}>
                      <div className="text-3xl font-bold text-primary">
                        {replaceVars(t(`marketSection.opportunityCard.metrics.${metric}.value`))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t(`marketSection.opportunityCard.metrics.${metric}.label`)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <h2 className="text-3xl font-bold mb-6 mt-12">{t('urgencySection.title')}</h2>

            <p className="text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{
              __html: t('urgencySection.paragraph1').replace('{strongSpots}', `<strong>${t('urgencySection.strongSpots')}</strong>`)
            }} />

            <p className="text-xl font-semibold mb-8" dangerouslySetInnerHTML={{
              __html: replaceVars(t('urgencySection.paragraph2'))
                .replace('{strongJoin}', `<strong>${replaceVars(t('urgencySection.strongJoin'))}</strong>`)
                .replace('{applyLink}', `<a href="/preparer/start" class="text-primary hover:underline">${t('urgencySection.applyLinkText')}</a>`)
            }} />

            {/* How to Become Section */}
            <h2 className="text-3xl font-bold mb-6 mt-12">{replaceVars(t('howToBecome.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{
              __html: replaceVars(t('howToBecome.intro'))
                .replace('{strongCertified}', `<strong>${t('howToBecome.strongCertified')}</strong>`)
            }} />

            <div className="space-y-6 mb-8">
              {['step1', 'step2', 'step3', 'step4'].map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{t(`howToBecome.steps.${step}.title`)}</h3>
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{
                      __html: replaceVars(t(`howToBecome.steps.${step}.description`))
                        .replace('{submitLink}', step === 'step1' ? `<a href="/preparer/start" class="text-primary hover:underline">${t('howToBecome.steps.step1.submitLinkText')}</a>` : '')
                        .replace('{trainingLink}', step === 'step2' ? `<a href="/training" class="text-primary hover:underline">${t('howToBecome.steps.step2.trainingLinkText')}</a>` : '')
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Salary Breakdown */}
            <h2 className="text-3xl font-bold mb-6 mt-12">{replaceVars(t('salaryBreakdown.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6">
              {replaceVars(t('salaryBreakdown.intro'))}
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {['partTime', 'fullTime', 'topEarners'].map((tier) => (
                <Card key={tier}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {t(`salaryBreakdown.cards.${tier}.amount`)}
                      </div>
                      <div className="text-sm font-semibold mb-2">
                        {t(`salaryBreakdown.cards.${tier}.title`)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {replaceVars(t(`salaryBreakdown.cards.${tier}.description`))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{
              __html: replaceVars(t('salaryBreakdown.pricingInfo'))
                .replace('{strongSimple}', `<strong>${t('salaryBreakdown.strongSimple')}</strong>`)
                .replace('{strongComplex}', `<strong>${t('salaryBreakdown.strongComplex')}</strong>`)
            }} />

            {/* Requirements */}
            <h2 className="text-3xl font-bold mb-6 mt-12">{replaceVars(t('requirements.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6">
              {replaceVars(t('requirements.intro'))}
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">{t('requirements.whatYouNeed.title')}</h3>
                <ul className="space-y-2">
                  {['item1', 'item2', 'item3', 'item4', 'item5'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <span>{t(`requirements.whatYouNeed.items.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/20 border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">{t('requirements.whatYouDontNeed.title')}</h3>
                <ul className="space-y-2">
                  {['item1', 'item2', 'item3', 'item4', 'item5'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-2xl">•</span>
                      <span>{t(`requirements.whatYouDontNeed.items.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-lg leading-relaxed mb-8">
              <strong>{city('city')} {isSpanish ? 'Ventaja' : 'Advantage'}:</strong> {replaceVars(t('requirements.bonus'))}
            </p>

            {/* Day in the Life */}
            <h2 className="text-3xl font-bold mb-6 mt-12">{replaceVars(t('dayInLife.title'))}</h2>

            <p className="text-lg leading-relaxed mb-6">
              {replaceVars(t('dayInLife.intro'))}
            </p>

            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {['time1', 'time2', 'time3', 'time4', 'time5', 'time6'].map((time) => (
                    <div key={time}>
                      <div className="font-bold text-lg mb-2">{t(`dayInLife.schedule.${time}.time`)}</div>
                      <p className="text-muted-foreground" dangerouslySetInnerHTML={{
                        __html: replaceVars(t(`dayInLife.schedule.${time}.description`))
                          .replace('{servicesLink}', time === 'time6' ? `<a href="/services" class="text-primary hover:underline">${replaceVars(t('dayInLife.schedule.time6.servicesLinkText'))}</a>` : '')
                      }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-lg leading-relaxed mb-8" dangerouslySetInnerHTML={{
              __html: replaceVars(t('dayInLife.offSeason'))
                .replace('{joinLink}', `<a href="/preparer/start" class="text-primary hover:underline">${t('dayInLife.joinLinkText')}</a>`)
            }} />
          </div>

          {/* Success Stories / Testimonials */}
          <section className="py-16 px-6 bg-muted/20 rounded-lg mt-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{replaceVars(t('testimonials.title'))}</h2>
              <p className="text-lg text-muted-foreground">{t('testimonials.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['angela', 'chelsea', 'gelsia', 'yaumar'].map((person) => (
                <Card key={person} className="overflow-hidden">
                  <CardContent className="pt-6 text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                      <Image
                        src={`/testimonials/${person === 'chelsea' ? 'chelseamichelllowe' : person === 'angela' ? 'angelarichards' : person === 'gelsia' ? 'gelsiawhite' : 'yaumarwilliams'}.png`}
                        alt={t(`testimonials.people.${person}.name`)}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm italic mb-4 text-muted-foreground">
                      "{t(`testimonials.people.${person}.quote`)}"
                    </p>
                    <div className="font-semibold">{t(`testimonials.people.${person}.name`)}</div>
                    <div className="text-sm text-muted-foreground">
                      {replaceVars(t(`testimonials.people.${person}.location`))}
                    </div>
                    <div className="text-primary font-bold mt-2 text-lg">
                      {t(`testimonials.people.${person}.income`)}{t('testimonials.yearSuffix')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-8 text-center text-white mt-12">
            <h3 className="text-3xl font-bold mb-4">{t('finalCta.title')}</h3>
            <p className="text-lg mb-6 opacity-90">
              {t('finalCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Link href="/preparer/start">
                  {t('finalCta.buttons.primary')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white">
                <Link href="/preparer/start">
                  {t('finalCta.buttons.secondary')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Service Areas */}
          <div className="mt-12 text-center">
            <h3 className="text-xl font-semibold mb-4">{replaceVars(t('serviceAreas.title'))}</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {neighborhoods.map((area) => (
                <Badge key={area} variant="secondary" className="text-sm px-3 py-1">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Optimized for LLMs and Featured Snippets */}
      <TaxPreparerFAQ city={city('city')} />
    </div>
  );
}
