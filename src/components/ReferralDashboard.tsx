'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Users,
  TrendingUp,
  Trophy,
  Share2,
  Copy,
  Facebook,
  Twitter,
  MessageCircle,
  Mail,
  Gift,
  Star,
  Zap,
  Target,
  Award,
  ChevronUp,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';

interface ReferralData {
  referralCode: string;
  vanityUrl: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  thisMonthReferrals: number;
  lastMonthReferrals: number;
  conversionRate: number;
  nextTierProgress: number;
  nextTierRequirement: number;
}

interface ReferralDashboardProps {
  userId?: string;
  language?: 'en' | 'es';
}

export default function ReferralDashboard({ userId, language = 'en' }: ReferralDashboardProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  const content = {
    en: {
      title: 'Referral Dashboard',
      description: 'Track your referrals and earnings',
      totalEarnings: 'Total Earnings',
      availableBalance: 'Available Balance',
      totalReferrals: 'Total Referrals',
      conversionRate: 'Conversion Rate',
      currentTier: 'Current Tier',
      nextTier: 'Next Tier',
      progressToNext: 'Progress to {tier}',
      referralsNeeded: '{count} more referrals needed',
      yourReferralLink: 'Your Referral Link',
      copyLink: 'Copy Link',
      shareOn: 'Share on',
      statistics: 'Statistics',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      allTime: 'All Time',
      qualified: 'Qualified',
      pending: 'Pending',
      week: 'This Week',
      month: 'This Month',
      all: 'All Time',
      referralActivity: 'Referral Activity',
      cashOut: 'Cash Out',
      minimumCashout: 'Minimum: $100',
      howItWorks: 'How It Works',
      steps: [
        'Share your unique referral link',
        'Friends sign up and get their advance',
        'Earn $100 for each qualified referral',
        'Cash out anytime over $100',
      ],
      tiers: {
        bronze: { name: 'Bronze', color: 'bg-accent', icon: '🥉', bonus: '$50' },
        silver: { name: 'Silver', color: 'bg-gray-400', icon: '🥈', bonus: '$75' },
        gold: { name: 'Gold', color: 'bg-yellow-500', icon: '🥇', bonus: '$100' },
        platinum: { name: 'Platinum', color: 'bg-purple-600', icon: '💎', bonus: '$150' },
      },
      recentReferrals: [
        { name: 'John D.', status: 'qualified', amount: 100, date: '2 hours ago' },
        { name: 'Maria S.', status: 'pending', amount: 0, date: '5 hours ago' },
        { name: 'Robert K.', status: 'qualified', amount: 100, date: 'Yesterday' },
        { name: 'Lisa M.', status: 'qualified', amount: 100, date: '2 days ago' },
      ],
    },
    es: {
      title: 'Panel de Referencias',
      description: 'Rastrea tus referencias y ganancias',
      totalEarnings: 'Ganancias Totales',
      availableBalance: 'Saldo Disponible',
      totalReferrals: 'Referencias Totales',
      conversionRate: 'Tasa de Conversión',
      currentTier: 'Nivel Actual',
      nextTier: 'Siguiente Nivel',
      progressToNext: 'Progreso a {tier}',
      referralsNeeded: '{count} referencias más necesarias',
      yourReferralLink: 'Tu Enlace de Referencia',
      copyLink: 'Copiar Enlace',
      shareOn: 'Compartir en',
      statistics: 'Estadísticas',
      thisMonth: 'Este Mes',
      lastMonth: 'Mes Pasado',
      allTime: 'Todo el Tiempo',
      qualified: 'Calificado',
      pending: 'Pendiente',
      week: 'Esta Semana',
      month: 'Este Mes',
      all: 'Todo',
      referralActivity: 'Actividad de Referencias',
      cashOut: 'Retirar',
      minimumCashout: 'Mínimo: $100',
      howItWorks: 'Cómo Funciona',
      steps: [
        'Comparte tu enlace único de referencia',
        'Amigos se registran y obtienen su adelanto',
        'Gana $100 por cada referencia calificada',
        'Retira en cualquier momento sobre $100',
      ],
      tiers: {
        bronze: { name: 'Bronce', color: 'bg-accent', icon: '🥉', bonus: '$50' },
        silver: { name: 'Plata', color: 'bg-gray-400', icon: '🥈', bonus: '$75' },
        gold: { name: 'Oro', color: 'bg-yellow-500', icon: '🥇', bonus: '$100' },
        platinum: { name: 'Platino', color: 'bg-purple-600', icon: '💎', bonus: '$150' },
      },
      recentReferrals: [
        { name: 'Juan D.', status: 'qualified', amount: 100, date: 'Hace 2 horas' },
        { name: 'María S.', status: 'pending', amount: 0, date: 'Hace 5 horas' },
        { name: 'Roberto K.', status: 'qualified', amount: 100, date: 'Ayer' },
        { name: 'Lisa M.', status: 'qualified', amount: 100, date: 'Hace 2 días' },
      ],
    },
  };

  const t = content[language];

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    setIsLoading(true);

    // Simulate API call (in production, fetch from database)
    setTimeout(() => {
      setReferralData({
        referralCode: 'TAXGENIUS2024',
        vanityUrl: 'taxgeniuspro.tax/johndoe',
        tier: 'gold',
        totalReferrals: 47,
        qualifiedReferrals: 35,
        pendingReferrals: 12,
        totalEarnings: 3500,
        availableBalance: 850,
        thisMonthReferrals: 8,
        lastMonthReferrals: 12,
        conversionRate: 0.74,
        nextTierProgress: 35,
        nextTierRequirement: 50,
      });
      setIsLoading(false);
    }, 1000);
  };

  const copyReferralLink = () => {
    if (referralData) {
      navigator.clipboard.writeText(`https://${referralData.vanityUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnSocial = (platform: string) => {
    if (!referralData) return;

    const message = `Get $7,000 cash advance in 10 minutes! Use my link for $50 bonus:`;
    const url = `https://${referralData.vanityUrl}`;

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message + ' ' + url)}`,
      email: `mailto:?subject=Get%20%247000%20Cash%20Advance&body=${encodeURIComponent(message + ' ' + url)}`,
    };

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
  };

  if (isLoading || !referralData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading referral data...
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = t.tiers[referralData.tier];
  const progressPercent = (referralData.nextTierProgress / referralData.nextTierRequirement) * 100;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalEarnings}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ${referralData.totalEarnings.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +$800 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.availableBalance}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${referralData.availableBalance.toLocaleString()}</p>
            <Button size="sm" className="mt-2">
              {t.cashOut}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalReferrals}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{referralData.totalReferrals}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="success" className="text-xs">
                {referralData.qualifiedReferrals} {t.qualified}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {referralData.pendingReferrals} {t.pending}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.conversionRate}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(referralData.conversionRate * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Industry avg: 45%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t.currentTier}</CardTitle>
              <CardDescription>
                {t.progressToNext.replace('{tier}', t.tiers.platinum.name)}
              </CardDescription>
            </div>
            <Badge className={`${tierInfo.color} text-white text-lg px-3 py-1`}>
              <span className="mr-2">{tierInfo.icon}</span>
              {tierInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {referralData.nextTierProgress} / {referralData.nextTierRequirement} referrals
              </span>
              <span className="font-medium">
                {t.referralsNeeded.replace(
                  '{count}',
                  String(referralData.nextTierRequirement - referralData.nextTierProgress)
                )}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {Object.entries(t.tiers).map(([key, tier]) => (
                <div
                  key={key}
                  className={`text-center p-2 rounded-lg ${
                    key === referralData.tier ? 'bg-muted' : ''
                  }`}
                >
                  <div className="text-2xl">{tier.icon}</div>
                  <p className="text-xs font-medium mt-1">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">{tier.bonus}/ref</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>{t.yourReferralLink}</CardTitle>
          <CardDescription>Share this link to earn commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={`https://${referralData.vanityUrl}`}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyReferralLink} variant="outline">
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t.copyLink}
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('facebook')}
                className="flex-1"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('twitter')}
                className="flex-1"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('whatsapp')}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{t.referralActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week">{t.week}</TabsTrigger>
              <TabsTrigger value="month">{t.month}</TabsTrigger>
              <TabsTrigger value="all">{t.all}</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPeriod} className="space-y-3 mt-4">
              {t.recentReferrals.map((referral, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-xs text-muted-foreground">{referral.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={referral.status === 'qualified' ? 'success' : 'secondary'}>
                      {referral.status}
                    </Badge>
                    {referral.amount > 0 && (
                      <span className="font-semibold text-green-600">+${referral.amount}</span>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>{t.howItWorks}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
