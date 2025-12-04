'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

function ErrorContent() {
  const t = useTranslations('auth.error');
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  // Get error info from translations or fall back to Default
  const errorKey = error as keyof typeof t;
  const hasError = t.has(`errors.${error}.title`);
  const errorType = hasError ? error : 'Default';

  const errorTitle = t(`errors.${errorType}.title`);
  const errorDescription = t(`errors.${errorType}.description`);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <CardTitle className="text-2xl">{errorTitle}</CardTitle>
        <CardDescription className="mt-2">{errorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === 'Configuration' && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>{t('technicalDetails')}</strong> {t('contactSupport')}
            </p>
          </div>
        )}

        {error === 'CredentialsSignin' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('tip')}</strong> {t('correctCredentials')}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">{t('tryAgain')}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">{t('goHome')}</Link>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('needHelp')}{' '}
            <Link href="/contact" className="text-primary hover:underline">
              {t('contactSupportLink')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  const t = useTranslations('auth.error');

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
        </div>
        <CardTitle className="text-2xl">{t('loading')}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Suspense fallback={<LoadingFallback />}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
