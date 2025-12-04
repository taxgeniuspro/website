'use client';

import { Shield, Award, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CredentialsSection() {
  const t = useTranslations('home.credentials');

  const credentials = [
    {
      icon: Shield,
      titleKey: 'credential1.title',
      subtitleKey: 'credential1.subtitle',
      color: 'text-primary',
    },
    {
      icon: Award,
      titleKey: 'credential2.title',
      subtitleKey: 'credential2.subtitle',
      color: 'text-primary',
    },
    {
      icon: CheckCircle,
      titleKey: 'credential3.title',
      subtitleKey: 'credential3.subtitle',
      color: 'text-primary',
    },
    {
      icon: Shield,
      titleKey: 'credential4.title',
      subtitleKey: 'credential4.subtitle',
      color: 'text-success',
    },
  ];
  return (
    <section className="py-16 bg-muted/50 border-y">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold mb-3">{t('sectionTitle')}</h2>
          <p className="text-muted-foreground">{t('sectionSubtitle')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {credentials.map((credential, index) => (
            <div key={index} className="text-center group">
              <div className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <credential.icon className={`w-12 h-12 ${credential.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">📸 150×150px</p>
                  <p className="font-semibold">{t(credential.titleKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(credential.subtitleKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            {t('bottomNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
