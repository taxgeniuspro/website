'use client';

import { Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Magic Link Verification Page
 *
 * Shown after user requests a magic link.
 * Instructs them to check their email for the login link.
 */
export default function VerifyRequestPage() {
  const t = useTranslations('auth.verify');

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="text-center">
            <Image
              src="/images/wordpress-assets/taxgenius-logo.png"
              alt="Tax Genius Pro"
              width={200}
              height={50}
              className="h-12 w-auto mx-auto mb-6"
            />
          </div>

          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-background">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">{t('title', { defaultValue: 'Check your email' })}</h1>
            <p className="text-muted-foreground text-lg">
              {t('description', {
                defaultValue: 'A sign-in link has been sent to your email address.'
              })}
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {t('clickLink', {
                defaultValue: 'Click the link in the email to sign in to your account. The link will expire in 24 hours.'
              })}
            </AlertDescription>
          </Alert>

          {/* Tips */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold">{t('tips.title', { defaultValue: "Didn't receive the email?" })}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('tips.checkSpam', { defaultValue: 'Check your spam or junk folder' })}</li>
              <li>{t('tips.checkTypo', { defaultValue: 'Make sure you entered the correct email address' })}</li>
              <li>{t('tips.wait', { defaultValue: 'Wait a few minutes for the email to arrive' })}</li>
            </ul>
          </div>

          {/* Back to Sign In */}
          <div className="pt-6 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = '/auth/signin'}
            >
              {t('backToSignIn', { defaultValue: 'Back to Sign In' })}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-sm text-muted-foreground">
          {t('footer', {
            defaultValue: 'This link was sent from a secure Tax Genius Pro server.'
          })}
        </p>
      </div>
    </div>
  );
}
