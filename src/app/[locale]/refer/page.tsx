'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DollarSign,
  Users,
  Trophy,
  Star,
  Gift,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Globe,
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Link2,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react';

interface ReferrerData {
  name: string;
  avatar?: string;
  referralCode: string;
  totalReferrals: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  joinedDate: string;
  testimonial?: string;
  earnings: number;
}

function ReferralContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('code') || searchParams.get('ref') || '';

  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referrer, setReferrer] = useState<ReferrerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 12, minutes: 47 });

  const content = {
    en: {
      heroTitle: 'Get $7,000 Cash + $50 Bonus!',
      heroSubtitle: 'Your friend {referrerName} earned $2,500 last month. You can too!',
      defaultSubtitle: 'Join thousands getting their tax advance today',
      urgentBadge: '🎁 Limited Time: Extra $50 bonus ends in',
      ctaButton: 'Get My $7,000 + Bonus',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      phoneLabel: 'Phone Number (Optional)',
      phonePlaceholder: '(555) 123-4567',
      referredBy: 'Referred by',
      trustBadge: 'trusted referrer',
      features: [
        'Instant approval in 30 seconds',
        '$0 fees (limited time)',
        'No credit check required',
        'Money in 10 minutes',
      ],
      socialProof: {
        title: 'Join 5,000+ Happy Customers',
        stat1: { value: '$3.5M', label: 'Paid out this week' },
        stat2: { value: '4.9★', label: 'Customer rating' },
        stat3: { value: '10 min', label: 'Average time to cash' },
      },
      referrerStats: {
        referrals: 'Total Referrals',
        tier: 'Referrer Tier',
        member: 'Member since',
      },
      tiers: {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Platinum',
      },
      shareTitle: "You're missing out on easy money!",
      shareMessage: 'I just got $2,500 from my tax advance in 10 minutes! Get yours + $50 bonus:',
      testimonials: [
        {
          name: 'Maria G.',
          amount: '$4,500',
          time: '8 minutes',
          text: "Can't believe how fast this was!",
        },
        {
          name: 'James K.',
          amount: '$3,000',
          time: '12 minutes',
          text: 'Money was in my account before I finished coffee',
        },
        {
          name: 'Ashley R.',
          amount: '$7,000',
          time: '6 minutes',
          text: 'Best decision I made this year!',
        },
      ],
    },
    es: {
      heroTitle: '¡Obtén $7,000 en Efectivo + $50 de Bono!',
      heroSubtitle: 'Tu amigo {referrerName} ganó $2,500 el mes pasado. ¡Tú también puedes!',
      defaultSubtitle: 'Únete a miles obteniendo su adelanto de impuestos hoy',
      urgentBadge: '🎁 Tiempo Limitado: Bono extra de $50 termina en',
      ctaButton: 'Obtener Mis $7,000 + Bono',
      emailLabel: 'Correo Electrónico',
      emailPlaceholder: 'tu@ejemplo.com',
      phoneLabel: 'Número de Teléfono (Opcional)',
      phonePlaceholder: '(555) 123-4567',
      referredBy: 'Referido por',
      trustBadge: 'referidor confiable',
      features: [
        'Aprobación instantánea en 30 segundos',
        '$0 comisiones (tiempo limitado)',
        'No requiere verificación de crédito',
        'Dinero en 10 minutos',
      ],
      socialProof: {
        title: 'Únete a 5,000+ Clientes Felices',
        stat1: { value: '$3.5M', label: 'Pagado esta semana' },
        stat2: { value: '4.9★', label: 'Calificación' },
        stat3: { value: '10 min', label: 'Tiempo promedio' },
      },
      referrerStats: {
        referrals: 'Referencias Totales',
        tier: 'Nivel de Referidor',
        member: 'Miembro desde',
      },
      tiers: {
        bronze: 'Bronce',
        silver: 'Plata',
        gold: 'Oro',
        platinum: 'Platino',
      },
      shareTitle: '¡Te estás perdiendo dinero fácil!',
      shareMessage:
        '¡Acabo de obtener $2,500 de mi adelanto en 10 minutos! Obtén el tuyo + $50 de bono:',
      testimonials: [
        {
          name: 'Maria G.',
          amount: '$4,500',
          time: '8 minutos',
          text: '¡No puedo creer lo rápido que fue!',
        },
        {
          name: 'Carlos M.',
          amount: '$3,000',
          time: '12 minutos',
          text: 'El dinero estaba en mi cuenta antes de terminar el café',
        },
        {
          name: 'Isabella R.',
          amount: '$7,000',
          time: '6 minutos',
          text: '¡La mejor decisión que tomé este año!',
        },
      ],
    },
  };

  const t = content[language];

  useEffect(() => {
    // Fetch referrer data if code exists
    if (referralCode) {
      fetchReferrerData(referralCode);
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes } = prev;

        if (minutes > 0) {
          minutes--;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
        }

        return { days, hours, minutes };
      });
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [referralCode]);

  const fetchReferrerData = async (code: string) => {
    // Simulate API call (in production, fetch from database)
    setTimeout(() => {
      setReferrer({
        name: 'Sarah Johnson',
        avatar: '/avatars/sarah.jpg',
        referralCode: code,
        totalReferrals: 47,
        tier: 'gold',
        joinedDate: '2023-11-15',
        testimonial: "I've made over $5,000 referring friends!",
        earnings: 5250,
      });
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Store referral in session/cookies
    if (referralCode) {
      sessionStorage.setItem('referralCode', referralCode);
      document.cookie = `ref=${referralCode}; max-age=2592000; path=/`; // 30 days
    }

    // Simulate API call
    setTimeout(() => {
      router.push(`/auth/signup?email=${encodeURIComponent(email)}&ref=${referralCode}`);
    }, 1000);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-orange-600';
      case 'silver':
        return 'bg-gray-400';
      case 'gold':
        return 'bg-yellow-500';
      case 'platinum':
        return 'bg-purple-600';
      default:
        return 'bg-primary';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return <Sparkles className="w-4 h-4" />;
      case 'gold':
        return <Trophy className="w-4 h-4" />;
      case 'silver':
        return <Star className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/refer?code=${referralCode}`;

  const shareOnSocial = (platform: string) => {
    const message = encodeURIComponent(t.shareMessage);
    const url = encodeURIComponent(shareUrl);

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}&url=${url}`,
      whatsapp: `https://wa.me/?text=${message}%20${url}`,
      copy: () => {
        navigator.clipboard.writeText(`${t.shareMessage} ${shareUrl}`);
        alert('Link copied to clipboard!');
      },
    };

    if (platform === 'copy') {
      shareUrls.copy();
    } else {
      window.open(shareUrls[platform as keyof typeof shareUrls] as string, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-orange-950/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-orange-600/10" />

        <div className="relative max-w-6xl mx-auto px-4 py-8 lg:py-12">
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'ES' : 'EN'}
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Column - Content */}
            <div className="space-y-6">
              {/* Referrer Badge */}
              {referrer && (
                <div className="inline-flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={referrer.avatar} />
                    <AvatarFallback>{referrer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t.referredBy} {referrer.name}
                    </span>
                    <Badge className={`${getTierColor(referrer.tier)} text-white`}>
                      {getTierIcon(referrer.tier)}
                      <span className="ml-1">{t.tiers[referrer.tier]}</span>
                    </Badge>
                  </div>
                </div>
              )}

              <div>
                <h1 className="text-4xl lg:text-6xl font-black mb-4 text-primary">
                  {t.heroTitle}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  {referrer
                    ? t.heroSubtitle.replace('{referrerName}', referrer.name)
                    : t.defaultSubtitle}
                </p>
              </div>

              {/* Countdown Timer */}
              <Alert className="bg-card dark:bg-red-950/20 border-red-200">
                <Zap className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-base font-medium">
                  <div>{t.urgentBadge}</div>
                  <div className="flex gap-4 mt-2 text-2xl font-bold text-red-600">
                    <span>{timeLeft.days}d</span>
                    <span>{timeLeft.hours}h</span>
                    <span>{timeLeft.minutes}m</span>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {t.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Social Proof Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{t.socialProof.stat1.value}</p>
                  <p className="text-xs text-muted-foreground">{t.socialProof.stat1.label}</p>
                </div>
                <div className="text-center border-x">
                  <p className="text-2xl font-bold text-green-600">{t.socialProof.stat2.value}</p>
                  <p className="text-xs text-muted-foreground">{t.socialProof.stat2.label}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{t.socialProof.stat3.value}</p>
                  <p className="text-xs text-muted-foreground">{t.socialProof.stat3.label}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div>
              <Card className="shadow-2xl border-2">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-2xl">
                    <span className="flex items-center gap-2">
                      <Gift className="w-6 h-6 text-primary" />
                      {t.heroTitle}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {referrer && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">{referrer.name} is a</span>
                        <Badge variant="secondary">{t.trustBadge}</Badge>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.emailLabel}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.phoneLabel}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    {referralCode && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-900 dark:text-green-100">
                            Referral Code Applied
                          </span>
                          <Badge variant="success" className="bg-green-600 text-white">
                            {referralCode}
                          </Badge>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          You'll receive an extra $50 bonus!
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {t.ctaButton}
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}
                    </Button>
                  </form>

                  {/* Referrer Stats */}
                  {referrer && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.referrerStats.referrals}</span>
                        <span className="font-semibold">{referrer.totalReferrals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.referrerStats.tier}</span>
                        <Badge className={`${getTierColor(referrer.tier)} text-white`}>
                          {t.tiers[referrer.tier]}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.referrerStats.member}</span>
                        <span className="font-semibold">
                          {new Date(referrer.joinedDate).toLocaleDateString()}
                        </span>
                      </div>
                      {referrer.testimonial && (
                        <div className="pt-2 mt-2 border-t">
                          <p className="text-sm italic text-muted-foreground">
                            "{referrer.testimonial}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <p className="text-xs text-center text-muted-foreground w-full">
                    Secure • No Credit Check • Instant Approval
                  </p>
                </CardFooter>
              </Card>

              {/* Share Buttons */}
              {referralCode && (
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                  <p className="text-sm font-medium mb-3 text-center">
                    Share & Earn $100 per referral
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareOnSocial('facebook')}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">Facebook</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareOnSocial('twitter')}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <Twitter className="w-5 h-5 text-sky-500" />
                      <span className="text-xs">Twitter</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareOnSocial('whatsapp')}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareOnSocial('copy')}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <Link2 className="w-5 h-5" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">{t.socialProof.title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {t.testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">{testimonial.name}</span>
                  <Badge variant="success" className="bg-green-600 text-white">
                    {testimonial.amount}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">"{testimonial.text}"</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Received in {testimonial.time}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-full max-w-4xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ReferralContent />
    </Suspense>
  );
}
