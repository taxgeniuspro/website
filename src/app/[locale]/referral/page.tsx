'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  Share2,
  Wallet,
  Clock,
  CheckCircle,
  Smartphone,
  Mail,
  MessageCircle,
  BarChart3,
  Award,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ReferralPage() {
  const t = useTranslations('referral');
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/wordpress-assets/taxgenius-logo.png"
                alt="Tax Genius Pro"
                width={200}
                height={50}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost">{t('header.backToHome')}</Button>
              </Link>
              <Link href="/auth/signup?role=client">
                <Button className="bg-primary hover:bg-primary/90">
                  {t('header.joinNow')} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center text-white space-y-8 max-w-4xl mx-auto">
            <Badge className="bg-yellow-400 text-blue-900 border-0 text-base px-4 py-2">
              <Gift className="w-4 h-4 mr-1" />
              {t('hero.badge')}
            </Badge>

            <h1 className="text-4xl lg:text-7xl font-bold leading-tight">
              {t('hero.title')} <span className="text-yellow-400">{t('hero.titleAmount')}</span>
            </h1>

            <p className="text-2xl lg:text-3xl">{t('hero.subtitle')}</p>

            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              {t('hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/auth/signup?role=client">
                <Button
                  size="lg"
                  className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 text-lg px-8 shadow-xl hover:scale-105 transition-transform"
                >
                  {t('hero.ctaStartReferring')} <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-2 border-white text-white hover:bg-white/10"
              >
                {t('hero.ctaHowItWorks')}
              </Button>
            </div>

            {/* Hero Image Placeholder */}
            <div className="mt-12 max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="aspect-video flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-yellow-400/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <Gift className="w-16 h-16 text-yellow-400" />
                    </div>
                    <p className="text-lg font-semibold text-white mb-2">
                      {t('hero.imageReplaceText')}
                    </p>
                    <p className="text-sm text-white/80">{t('hero.imageRecommendation')}</p>
                    <p className="text-xs text-white/70 mt-2">
                      {t('hero.imageSuggestion')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm opacity-75 pt-4">{t('hero.termsApply')}</p>
          </div>
        </div>
      </section>

      {/* How Much Can You Earn */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">{t('earnings.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('earnings.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                referrals: t('earnings.tier1.referrals'),
                amount: t('earnings.tier1.amount'),
                description: t('earnings.tier1.description'),
              },
              {
                referrals: t('earnings.tier2.referrals'),
                amount: t('earnings.tier2.amount'),
                description: t('earnings.tier2.description'),
                highlight: true,
              },
              {
                referrals: t('earnings.tier3.referrals'),
                amount: t('earnings.tier3.amount'),
                description: t('earnings.tier3.description'),
              },
            ].map((tier, index) => (
              <Card
                key={index}
                className={`text-center ${tier.highlight ? 'border-primary border-2 shadow-xl scale-105' : ''}`}
              >
                <CardHeader>
                  {tier.highlight && (
                    <Badge className="w-fit mx-auto mb-2 bg-primary">{t('earnings.tier2.badge')}</Badge>
                  )}
                  <CardTitle className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                    {tier.amount}
                  </CardTitle>
                  <CardDescription className="text-lg">{tier.referrals}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{tier.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">
            {t('howItWorks.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: t('howItWorks.step1.step'),
                icon: Share2,
                title: t('howItWorks.step1.title'),
                description: t('howItWorks.step1.description'),
              },
              {
                step: t('howItWorks.step2.step'),
                icon: Users,
                title: t('howItWorks.step2.title'),
                description: t('howItWorks.step2.description'),
              },
              {
                step: t('howItWorks.step3.step'),
                icon: Wallet,
                title: t('howItWorks.step3.title'),
                description: t('howItWorks.step3.description'),
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <item.icon className="w-10 h-10 text-primary" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-lg">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">{t('benefits.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: DollarSign,
                title: t('benefits.highPayouts.title'),
                description: t('benefits.highPayouts.description'),
              },
              {
                icon: Zap,
                title: t('benefits.noLimits.title'),
                description: t('benefits.noLimits.description'),
              },
              {
                icon: Clock,
                title: t('benefits.quickPayments.title'),
                description: t('benefits.quickPayments.description'),
              },
              {
                icon: BarChart3,
                title: t('benefits.trackEverything.title'),
                description: t('benefits.trackEverything.description'),
              },
              {
                icon: Smartphone,
                title: t('benefits.easySharing.title'),
                description: t('benefits.easySharing.description'),
              },
              {
                icon: Award,
                title: t('benefits.bonusRewards.title'),
                description: t('benefits.bonusRewards.description'),
              },
              {
                icon: TrendingUp,
                title: t('benefits.passiveIncome.title'),
                description: t('benefits.passiveIncome.description'),
              },
              {
                icon: Gift,
                title: t('benefits.friendsSave.title'),
                description: t('benefits.friendsSave.description'),
              },
            ].map((benefit, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Share */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">{t('sharing.title')}</h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: MessageCircle,
                title: t('sharing.socialMedia.title'),
                description: t('sharing.socialMedia.description'),
              },
              {
                icon: Mail,
                title: t('sharing.emailText.title'),
                description: t('sharing.emailText.description'),
              },
              {
                icon: Users,
                title: t('sharing.wordOfMouth.title'),
                description: t('sharing.wordOfMouth.description'),
              },
            ].map((method, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <method.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>{method.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{method.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">{t('faq.title')}</h2>

            <div className="space-y-4">
              {[
                {
                  question: t('faq.q1.question'),
                  answer: t('faq.q1.answer'),
                },
                {
                  question: t('faq.q2.question'),
                  answer: t('faq.q2.answer'),
                },
                {
                  question: t('faq.q3.question'),
                  answer: t('faq.q3.answer'),
                },
                {
                  question: t('faq.q4.question'),
                  answer: t('faq.q4.answer'),
                },
                {
                  question: t('faq.q5.question'),
                  answer: t('faq.q5.answer'),
                },
              ].map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-start text-lg">
                      <CheckCircle className="w-5 h-5 mr-2 text-primary mt-0.5 flex-shrink-0" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground ml-7">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl" />
            <CardContent className="p-12 text-center relative">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
                {t('finalCTA.title')}
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                {t('finalCTA.subtitle')}
              </p>
              <Link href="/auth/signup?role=client">
                <Button
                  size="lg"
                  className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 text-lg px-8 shadow-xl hover:scale-105 transition-transform"
                >
                  {t('finalCTA.ctaButton')} <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Badge
                  variant="secondary"
                  className="px-3 py-1 bg-white/20 text-white border-white/30"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  {t('finalCTA.badge1')}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-3 py-1 bg-white/20 text-white border-white/30"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {t('finalCTA.badge2')}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-3 py-1 bg-white/20 text-white border-white/30"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {t('finalCTA.badge3')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <Link href="/">
            <Image
              src="/images/wordpress-assets/taxgenius-logo.png"
              alt="Tax Genius Pro"
              width={150}
              height={40}
              className="h-10 w-auto mx-auto mb-4"
            />
          </Link>
          <p className="text-sm text-muted-foreground mb-2">
            {t('footer.copyright')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('footer.disclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
