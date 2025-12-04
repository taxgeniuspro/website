'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, CheckCircle, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import FluidBookingWidget from '@/components/FluidBookingWidget';

interface PreparerFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  languages: string;
  experienceLevel: string;
  taxSoftware: string[];
  smsConsent: 'yes' | 'no' | '';
}

interface TaxPreparerApplicationFormProps {
  onSubmitSuccess?: () => void;
}

export default function TaxPreparerApplicationForm({
  onSubmitSuccess,
}: TaxPreparerApplicationFormProps) {
  const t = useTranslations('forms.preparerApplication');
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [defaultPreparerId, setDefaultPreparerId] = useState<string>('cmh9ze4aj0002jx5kkpnnu3no'); // Ray Hamilton - Tax Genius Pro Team
  const [formData, setFormData] = useState<PreparerFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    languages: '',
    experienceLevel: '',
    taxSoftware: [],
    smsConsent: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save preparer application
      const response = await fetch('/api/preparers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          locale: locale, // Pass locale for language-based email routing
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      // Show calendar booking
      setShowCalendar(true);

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      logger.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.languages &&
      formData.experienceLevel &&
      formData.smsConsent === 'yes'
    );
  };

  // Fluid Booking: No external scripts needed anymore!

  if (showCalendar) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-center">{t('successTitle')}</CardTitle>
          <CardDescription className="text-center text-base">
            {t('successSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-6 rounded-lg space-y-2">
            <p className="font-semibold">{t('confirmationMessage')}</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                • {t('firstName')}: {formData.firstName} {formData.middleName} {formData.lastName}
              </li>
              <li>• {t('email')}: {formData.email}</li>
              <li>• {t('phone')}: {formData.phone}</li>
              <li>• {t('languages')}: {formData.languages}</li>
              <li>• {t('experienceLevel')}: {formData.experienceLevel === 'NEW' ? t('experienceNew') : formData.experienceLevel === 'INTERMEDIATE' ? t('experienceIntermediate') : t('experienceSeasoned')}</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg space-y-4">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              {t('scheduleInterviewTitle')}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('scheduleInterviewDescription')}
            </p>
          </div>

          {/* Fluid Booking Widget - Replacement for Calendly */}
          <FluidBookingWidget
            preparerId={defaultPreparerId}
            preparerName="Tax Genius Pro Team"
            clientInfo={{
              name: `${formData.firstName} ${formData.middleName} ${formData.lastName}`.trim(),
              email: formData.email,
              phone: formData.phone,
            }}
            appointmentType="CONSULTATION"
            duration={30}
            source="preparer_app"
            customMessage="Schedule your preparer interview appointment. We're excited to learn more about you!"
            onBookingComplete={(appointmentId) => {
              logger.info('Interview appointment booked', { appointmentId });
            }}
          />

          <div className="text-sm text-center text-muted-foreground space-y-2">
            <p>{t('confirmationEmailSent', { email: formData.email })}</p>
            <p>{t('confirmationSmsSent', { phone: formData.phone })}</p>
            <p className="text-xs pt-2">{t('closePageMessage')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">
            <UserPlus className="w-3 h-3 mr-1" />
            {t('badge')}
          </Badge>
        </div>
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>
          {t('subtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder={t('firstNamePlaceholder')}
                required
                className="text-lg p-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">{t('middleName')}</Label>
              <Input
                id="middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                placeholder={t('middleNamePlaceholder')}
                className="text-lg p-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder={t('lastNamePlaceholder')}
                required
                className="text-lg p-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')} *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t('emailPlaceholder')}
                required
                className="text-lg p-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')} *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder={t('phonePlaceholder')}
                required
                className="text-lg p-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">{t('languages')} *</Label>
              <Select
                value={formData.languages}
                onValueChange={(value) => setFormData({ ...formData, languages: value })}
                required
              >
                <SelectTrigger className="text-lg p-6">
                  <SelectValue placeholder={t('languagesPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">{t('languageEnglish')}</SelectItem>
                  <SelectItem value="Spanish">{t('languageSpanish')}</SelectItem>
                  <SelectItem value="Both">{t('languageBoth')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">{t('experienceLevel')} *</Label>
              <Select
                value={formData.experienceLevel}
                onValueChange={(value) => setFormData({ ...formData, experienceLevel: value })}
                required
              >
                <SelectTrigger className="text-lg p-6">
                  <SelectValue placeholder={t('experienceLevelPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">{t('experienceNew')}</SelectItem>
                  <SelectItem value="INTERMEDIATE">{t('experienceIntermediate')}</SelectItem>
                  <SelectItem value="SEASONED">{t('experienceSeasoned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.experienceLevel === 'INTERMEDIATE' ||
              formData.experienceLevel === 'SEASONED') && (
              <div className="space-y-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                <Label className="text-base font-semibold">{t('taxSoftwareTitle')}</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('taxSoftwareDescription')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'ATX',
                    'CCH ProSystem',
                    'Crosslink',
                    'Drake',
                    'Lacerte',
                    'MyTaxPrep Office',
                    'ProSeries',
                    'Taxact',
                    'Taxslayer',
                    'TaxWise',
                    'Turbo Tax',
                    'Ultra Tax',
                    'None',
                    'Other',
                  ].map((software) => (
                    <label key={software} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={formData.taxSoftware.includes(software)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              taxSoftware: [...formData.taxSoftware, software],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              taxSoftware: formData.taxSoftware.filter((s) => s !== software),
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{software}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm leading-relaxed">
                {t('smsConsentLabel')} *
              </Label>
              <Select
                value={formData.smsConsent}
                onValueChange={(value) => setFormData({ ...formData, smsConsent: value as any })}
                required
              >
                <SelectTrigger className="text-lg p-6 h-auto">
                  <SelectValue placeholder={t('smsConsentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('smsConsentYes')}</SelectItem>
                  <SelectItem value="no">{t('smsConsentNo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                {t('privacyNotice')}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg"
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? (
              <>{t('submitting')}</>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                {t('submitButton')}
              </>
            )}
          </Button>

          <div className="text-center">
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${isFormValid() ? 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isFormValid() ? t('formComplete') : t('formIncomplete')}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
