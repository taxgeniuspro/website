'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SignOutPage() {
  const t = useTranslations('auth.signout');

  useEffect(() => {
    // Sign out and redirect
    signOut({
      callbackUrl: '/auth/signin',
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">{t('signingOut')}</h2>
        <p className="text-muted-foreground">{t('pleaseWait')}</p>
      </div>
    </div>
  );
}
