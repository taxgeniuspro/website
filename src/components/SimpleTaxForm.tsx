'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  FileUp,
  Share2,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PreparerCard } from '@/components/PreparerCard';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';

// Tax intake form data structure
interface TaxFormData {
  // Page 2: Personal Information
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;

  // Page 3: Address
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;

  // Page 4: Identity Information
  date_of_birth: string;
  ssn: string;

  // Page 5: Dependent Status
  claimed_as_dependent: 'no' | 'yes' | '';

  // Page 6: Employment & Filing Status
  filing_status: string;
  employment_type: 'W2' | '1099' | 'Both' | '';
  occupation: string;

  // Page 7: Education
  in_college: 'no' | 'yes' | '';

  // Page 8: Dependents
  has_dependents: 'none' | 'yes' | '';
  number_of_dependents: string;
  dependents_under_24_student_or_disabled: 'no' | 'yes' | '';
  dependents_in_college: 'no' | 'yes' | '';
  child_care_provider: 'no' | 'yes' | '';

  // Page 9: Property
  has_mortgage: 'no' | 'yes' | '';

  // Page 10: Tax Credits
  denied_eitc: 'no' | 'yes' | '';

  // Page 11: IRS PIN
  has_irs_pin: 'no' | 'yes' | 'yes_locate' | '';
  irs_pin: string;

  // Page 12: Refund Advance
  wants_refund_advance: 'no' | 'yes' | '';

  // Page 13: Identification Documents
  drivers_license: string;
  license_expiration: string;
  license_file: File | null;
}

interface PreparerInfo {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  companyName?: string | null;
  licenseNo?: string | null;
  bio?: string | null;
}

// Component prop types
interface FormPageProps {
  formData: TaxFormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<TaxFormData>>;
}

interface FormPageWithFileProps extends FormPageProps {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SubmitPageProps {
  handleSubmit: () => Promise<void>;
}

interface SimpleTaxFormProps {
  preparer?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    email: string | null;
  } | null;
}

export default function SimpleTaxForm({ preparer: initialPreparer }: SimpleTaxFormProps = {}) {
  const t = useTranslations('forms.taxIntake');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [page, setPage] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [preparer, setPreparer] = useState<PreparerInfo | null>(initialPreparer as PreparerInfo | null);
  const [formData, setFormData] = useState<TaxFormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    country_code: '+1',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    date_of_birth: '',
    ssn: '',
    claimed_as_dependent: 'no',
    filing_status: '',
    employment_type: '',
    occupation: '',
    in_college: 'no',
    has_dependents: 'none',
    number_of_dependents: '',
    dependents_under_24_student_or_disabled: 'no',
    dependents_in_college: 'no',
    child_care_provider: 'no',
    has_mortgage: 'no',
    denied_eitc: 'no',
    has_irs_pin: 'no',
    irs_pin: '',
    wants_refund_advance: 'no',
    drivers_license: '',
    license_expiration: '',
    license_file: null,
  });

  // Fetch preparer info on mount (only if not provided via props)
  useEffect(() => {
    if (initialPreparer) {
      // Already have preparer from props, skip API call
      return;
    }

    const fetchPreparerInfo = async () => {
      try {
        const response = await fetch('/api/preparer/info');
        if (response.ok) {
          const data = await response.json();
          if (data.preparer) {
            setPreparer(data.preparer);
            logger.info('Preparer info loaded', { preparer: data.preparer.firstName });
          }
        }
      } catch (error) {
        logger.error('Error fetching preparer info:', error);
      }
    };

    fetchPreparerInfo();
  }, [initialPreparer]);

  // Auto-fill email from authenticated user
  useEffect(() => {
    if (isLoaded && user && user.emailAddresses && user.emailAddresses.length > 0) {
      const userEmail = user.emailAddresses[0].emailAddress;
      setFormData((prev) => ({
        ...prev,
        email: userEmail,
      }));
      logger.info('Email auto-filled from authenticated user', { email: userEmail });
    }
  }, [isLoaded, user]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Desktop has 10 pages, mobile has 14
  const totalPages = isDesktop ? 10 : 14;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        license_file: e.target.files[0],
      });
    }
  };

  // Save lead data to database
  const saveLeadData = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/tax-intake/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Personal Information & Address
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          country_code: formData.country_code,
          address_line_1: formData.address_line_1,
          address_line_2: formData.address_line_2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          // Complete Tax Information
          date_of_birth: formData.date_of_birth,
          ssn: formData.ssn,
          filing_status: formData.filing_status,
          employment_type: formData.employment_type,
          occupation: formData.occupation,
          claimed_as_dependent: formData.claimed_as_dependent,
          in_college: formData.in_college,
          has_dependents: formData.has_dependents,
          number_of_dependents: formData.number_of_dependents,
          dependents_under_24_student_or_disabled: formData.dependents_under_24_student_or_disabled,
          dependents_in_college: formData.dependents_in_college,
          child_care_provider: formData.child_care_provider,
          has_mortgage: formData.has_mortgage,
          denied_eitc: formData.denied_eitc,
          has_irs_pin: formData.has_irs_pin,
          irs_pin: formData.irs_pin,
          wants_refund_advance: formData.wants_refund_advance,
          drivers_license: formData.drivers_license,
          license_expiration: formData.license_expiration,
          // Full form data as JSON for any additional fields
          full_form_data: formData,
          // Language/Locale for email routing
          locale: locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save lead data');
      }

      const data = await response.json();
      logger.info('Lead saved:', data.leadId);
    } catch (error) {
      logger.error('Error saving lead:', error);
      // Continue anyway - don't block the user
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Save lead data after personal info + address pages
    if ((isDesktop && page === 2) || (!isDesktop && page === 3)) {
      await saveLeadData();
    }

    if (page < totalPages) {
      setPage(page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (page > 1) {
      setPage(page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    // Save to localStorage
    localStorage.setItem('taxFormData', JSON.stringify(formData));

    // Check if user is authenticated
    if (user && isLoaded) {
      // Authenticated user: show thank you page, then auto-redirect to dashboard
      logger.info('Authenticated user submitted tax form', { userId: user.id });
      setShowThankYou(true);
    } else {
      // Unauthenticated user: redirect to signup, then to referral tab
      logger.info('Unauthenticated user submitted tax form, redirecting to signup');
      window.location.href = `/auth/signup?email=${encodeURIComponent(formData.email)}&hint=tax_client&redirect_url=/dashboard/client?tab=referrals`;
    }
  };

  const isPageValid = (): boolean => {
    if (isDesktop) {
      // Desktop: 10 grouped pages
      switch (page) {
        case 1:
          return true; // Welcome
        case 2:
          return !!(
            formData.first_name &&
            formData.last_name &&
            formData.email &&
            formData.phone &&
            formData.address_line_1 &&
            formData.city &&
            formData.state &&
            formData.zip_code
          ); // Personal + Address
        case 3:
          return !!(formData.date_of_birth && formData.ssn); // Identity
        case 4:
          return !!(
            formData.claimed_as_dependent &&
            formData.filing_status &&
            formData.employment_type &&
            formData.occupation
          ); // Dependent Status + Filing
        case 5:
          return !!(
            formData.in_college &&
            formData.has_dependents &&
            (formData.has_dependents === 'none' || formData.number_of_dependents)
          ); // Education + Dependents
        case 6:
          return !!formData.has_mortgage; // Mortgage
        case 7:
          return !!(formData.denied_eitc && formData.has_irs_pin); // Tax Credits + IRS PIN
        case 8:
          return !!formData.wants_refund_advance; // Refund Advance
        case 9:
          return !!(formData.drivers_license && formData.license_expiration); // ID Documents
        case 10:
          return true; // Congratulations
        default:
          return false;
      }
    } else {
      // Mobile: 14 individual pages
      switch (page) {
        case 1:
          return true; // Welcome
        case 2:
          return !!(formData.first_name && formData.last_name && formData.email && formData.phone);
        case 3:
          return !!(
            formData.address_line_1 &&
            formData.city &&
            formData.state &&
            formData.zip_code
          );
        case 4:
          return !!(formData.date_of_birth && formData.ssn);
        case 5:
          return !!formData.claimed_as_dependent;
        case 6:
          return !!(formData.filing_status && formData.employment_type && formData.occupation);
        case 7:
          return !!formData.in_college;
        case 8:
          return !!(
            formData.has_dependents &&
            (formData.has_dependents === 'none' || formData.number_of_dependents)
          );
        case 9:
          return !!formData.has_mortgage;
        case 10:
          return !!formData.denied_eitc;
        case 11:
          return !!formData.has_irs_pin;
        case 12:
          return !!formData.wants_refund_advance;
        case 13:
          return !!(formData.drivers_license && formData.license_expiration);
        case 14:
          return true; // Congratulations
        default:
          return false;
      }
    }
  };

  // Map desktop page to mobile pages for rendering
  const getPageContent = () => {
    if (isDesktop) {
      // Desktop pages (grouped)
      switch (page) {
        case 1:
          return <WelcomePage onNext={handleNext} preparer={preparer} />;
        case 2:
          return (
            <PersonalAndAddressPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 3:
          return <IdentityPage formData={formData} handleInputChange={handleInputChange} />;
        case 4:
          return (
            <DependentAndFilingPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 5:
          return (
            <EducationAndDependentsPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 6:
          return <MortgagePage formData={formData} setFormData={setFormData} />;
        case 7:
          return (
            <TaxCreditsAndPinPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 8:
          return <RefundAdvancePage formData={formData} setFormData={setFormData} />;
        case 9:
          return (
            <IdDocumentsPage
              formData={formData}
              handleInputChange={handleInputChange}
              handleFileChange={handleFileChange}
            />
          );
        case 10:
          return <CongratulationsPage handleSubmit={handleSubmit} />;
        default:
          return null;
      }
    } else {
      // Mobile pages (individual)
      switch (page) {
        case 1:
          return <WelcomePage onNext={handleNext} preparer={preparer} />;
        case 2:
          return (
            <PersonalInfoPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 3:
          return <AddressPage formData={formData} handleInputChange={handleInputChange} />;
        case 4:
          return <IdentityPage formData={formData} handleInputChange={handleInputChange} />;
        case 5:
          return <DependentStatusPage formData={formData} setFormData={setFormData} />;
        case 6:
          return (
            <FilingStatusPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 7:
          return <EducationPage formData={formData} setFormData={setFormData} />;
        case 8:
          return <DependentsPage formData={formData} setFormData={setFormData} />;
        case 9:
          return <MortgagePage formData={formData} setFormData={setFormData} />;
        case 10:
          return <TaxCreditsPage formData={formData} setFormData={setFormData} />;
        case 11:
          return (
            <IrsPinPage
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          );
        case 12:
          return <RefundAdvancePage formData={formData} setFormData={setFormData} />;
        case 13:
          return (
            <IdDocumentsPage
              formData={formData}
              handleInputChange={handleInputChange}
              handleFileChange={handleFileChange}
            />
          );
        case 14:
          return <CongratulationsPage handleSubmit={handleSubmit} />;
        default:
          return null;
      }
    }
  };

  // Show thank you page for authenticated users after submission
  if (showThankYou) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardContent className="p-8">
          <ThankYouPage />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preparer Card - Show on all pages if preparer is assigned */}
      {preparer && page > 1 && <PreparerCard preparer={preparer} />}

      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        {/* Progress Header */}
        {page > 1 && page < totalPages && (
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-sm">
                {t('progressStep', { current: page, total: totalPages })}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {Math.round(((page - 1) / (totalPages - 1)) * 100)}% {tCommon('status')}
              </span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((page - 1) / (totalPages - 1)) * 100}%` }}
              />
            </div>
          </CardHeader>
        )}

        <CardContent className="space-y-6 p-8">
          {getPageContent()}

          {/* Navigation Buttons */}
          {page > 1 && page < totalPages && (
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tCommon('back')}
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={handleNext}
                disabled={!isPageValid() || isSaving}
              >
                {isSaving ? tCommon('loading') : tCommon('next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Page Components

function ThankYouPage() {
  const t = useTranslations('forms.taxIntake.thankYou');

  useEffect(() => {
    // Auto-redirect to client dashboard after 3 seconds
    const timer = setTimeout(() => {
      window.location.href = '/dashboard/client?tab=referrals';
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 text-center py-12">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-xl text-muted-foreground">
          {t('subtitle')}
        </p>
        <p className="text-lg">
          {t('message')}
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{useTranslations('common')('loading')}</span>
      </div>
    </div>
  );
}

function WelcomePage({ onNext, preparer }: { onNext: () => void; preparer?: PreparerInfo | null }) {
  const t = useTranslations('forms.taxIntake.page1');
  const preparerName = preparer
    ? `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim()
    : null;

  return (
    <div className="space-y-8 text-center py-8">
      {/* Tax Professional or Owliver Image */}
      <div className="flex justify-center">
        {preparer && preparer.avatarUrl ? (
          <div className="relative">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-primary shadow-xl">
              <Image
                src={preparer.avatarUrl}
                alt={preparerName || 'Tax Professional'}
                fill
                className="object-cover"
                priority
                quality={100}
                sizes="(max-width: 768px) 100px, 80px"
              />
            </div>
            {/* Verified Badge */}
            <div className="absolute -bottom-1 -right-1 bg-secondary rounded-full p-1.5 border-2 border-background shadow-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        ) : (
          <Image
            src="/icon-512x512.png"
            alt="Tax Genius Pro - Oliver the Owl"
            width={200}
            height={200}
            className="object-contain"
            priority
          />
        )}
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-xl text-muted-foreground">
          {t('subtitle')}
        </p>
        <div className="max-w-md mx-auto pt-4">
          <p className="text-lg">{t('description')}</p>
        </div>
      </div>
      <Button size="lg" onClick={onNext} className="mt-8">
        {t('startButton')}
        <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );
}

function PersonalInfoPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  const t = useTranslations('forms.taxIntake.page2');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t('firstName')} *</Label>
          <Input
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middle_name">{t('middleName')}</Label>
          <Input
            id="middle_name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleInputChange}
            className="text-lg p-6"
            placeholder={t('middleNamePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{t('lastName')} *</Label>
          <Input
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('lastNamePlaceholder')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')} *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('emailPlaceholder')}
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
          required
          className="text-lg p-6"
          placeholder={t('phonePlaceholder')}
        />
      </div>
    </div>
  );
}

function AddressPage({ formData, handleInputChange }: Omit<FormPageProps, 'setFormData'>) {
  const t = useTranslations('forms.taxIntake.page3');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line_1">{t('addressLine1')} *</Label>
        <Input
          id="address_line_1"
          name="address_line_1"
          value={formData.address_line_1}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('addressLine1Placeholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line_2">{t('addressLine2')}</Label>
        <Input
          id="address_line_2"
          name="address_line_2"
          value={formData.address_line_2}
          onChange={handleInputChange}
          className="text-lg p-6"
          placeholder={t('addressLine2Placeholder')}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">{t('city')} *</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">{t('state')} *</Label>
          <Input
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('statePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">{t('zipCode')} *</Label>
          <Input
            id="zip_code"
            name="zip_code"
            value={formData.zip_code}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('zipCodePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

// Combined page for desktop
function PersonalAndAddressPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  return (
    <div className="space-y-8">
      <PersonalInfoPage
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
      />
      <div className="border-t pt-8">
        <AddressPage formData={formData} handleInputChange={handleInputChange} />
      </div>
    </div>
  );
}

function IdentityPage({ formData, handleInputChange }: Omit<FormPageProps, 'setFormData'>) {
  const t = useTranslations('forms.taxIntake.page4');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">{t('dateOfBirth')} *</Label>
        <Input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          value={formData.date_of_birth}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('dateOfBirthPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ssn">{t('ssn')} *</Label>
        <Input
          id="ssn"
          name="ssn"
          type="text"
          maxLength={11}
          value={formData.ssn}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('ssnPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('ssnHint')}</p>
      </div>
    </div>
  );
}

function DependentStatusPage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page5');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">
          {t('claimedAsDependent')} *
        </Label>
        <Select
          value={formData.claimed_as_dependent}
          onValueChange={(value) =>
            setFormData({ ...formData, claimed_as_dependent: value as any })
          }
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FilingStatusPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  const t = useTranslations('forms.taxIntake.page6');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filing_status">{t('filingStatus')} *</Label>
        <Select
          value={formData.filing_status}
          onValueChange={(value) => setFormData({ ...formData, filing_status: value })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={t('filingStatusPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Single">{t('filingStatusSingle')}</SelectItem>
            <SelectItem value="Married filing separately">{t('filingStatusMarriedSeparate')}</SelectItem>
            <SelectItem value="Married filing jointly">{t('filingStatusMarriedJoint')}</SelectItem>
            <SelectItem value="Head of House Hold">{t('filingStatusHOH')}</SelectItem>
            <SelectItem value="Qualifying widow(er) with dependent child">
              {t('filingStatusQualifyingWidow')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('employmentType')} *</Label>
        <Select
          value={formData.employment_type}
          onValueChange={(value) => setFormData({ ...formData, employment_type: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="W2">{t('employmentW2')}</SelectItem>
            <SelectItem value="1099">{t('employment1099')}</SelectItem>
            <SelectItem value="Both">{t('employmentBoth')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation">{t('occupation')} *</Label>
        <Input
          id="occupation"
          name="occupation"
          value={formData.occupation}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('occupationPlaceholder')}
        />
      </div>
    </div>
  );
}

// Combined page for desktop
function DependentAndFilingPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  return (
    <div className="space-y-8">
      <DependentStatusPage formData={formData} setFormData={setFormData} />
      <div className="border-t pt-8">
        <FilingStatusPage
          formData={formData}
          handleInputChange={handleInputChange}
          setFormData={setFormData}
        />
      </div>
    </div>
  );
}

function EducationPage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page7');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('inCollege')} *</Label>
        <Select
          value={formData.in_college}
          onValueChange={(value) => setFormData({ ...formData, in_college: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DependentsPage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page8');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('hasDependents')} *</Label>
        <Select
          value={formData.has_dependents}
          onValueChange={(value) => setFormData({ ...formData, has_dependents: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('none')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.has_dependents === 'yes' && (
        <div className="space-y-2">
          <Label htmlFor="number_of_dependents">{t('numberOfDependents')} *</Label>
          <Input
            id="number_of_dependents"
            name="number_of_dependents"
            type="number"
            min="1"
            value={formData.number_of_dependents}
            onChange={handleInputChange}
            required
            className="text-lg p-6"
            placeholder={t('numberOfDependentsPlaceholder')}
          />
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-base">
          {t('under24StudentOrDisabled')} *
        </Label>
        <Select
          value={formData.dependents_under_24_student_or_disabled}
          onValueChange={(value) =>
            setFormData({ ...formData, dependents_under_24_student_or_disabled: value as any })
          }
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('noOption')}</SelectItem>
            <SelectItem value="yes">{t('yesOption')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('dependentsInCollege')} *</Label>
        <Select
          value={formData.dependents_in_college}
          onValueChange={(value) =>
            setFormData({ ...formData, dependents_in_college: value as any })
          }
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('noOption')}</SelectItem>
            <SelectItem value="yes">{t('yesOption')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base">
          {t('childCareProvider')} *
        </Label>
        <Select
          value={formData.child_care_provider}
          onValueChange={(value) => setFormData({ ...formData, child_care_provider: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('noOption')}</SelectItem>
            <SelectItem value="yes">{t('yesOption')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Combined page for desktop
function EducationAndDependentsPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  return (
    <div className="space-y-8">
      <EducationPage formData={formData} setFormData={setFormData} />
      <div className="border-t pt-8">
        <DependentsPage formData={formData} setFormData={setFormData} />
      </div>
    </div>
  );
}

function MortgagePage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page9');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('hasMortgage')} *</Label>
        <Select
          value={formData.has_mortgage}
          onValueChange={(value) => setFormData({ ...formData, has_mortgage: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TaxCreditsPage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page10');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">
          {t('deniedEITC')} *
        </Label>
        <Select
          value={formData.denied_eitc}
          onValueChange={(value) => setFormData({ ...formData, denied_eitc: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {t('eitcInfo')}
          </p>
        </div>
      </div>
    </div>
  );
}

function IrsPinPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  const t = useTranslations('forms.taxIntake.page11');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('hasIRSPin')} *</Label>
        <Select
          value={formData.has_irs_pin}
          onValueChange={(value) => setFormData({ ...formData, has_irs_pin: value as any })}
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
            <SelectItem value="yes_locate">{t('yesLocate')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {t('irsPinInfo')}
          </p>
        </div>
      </div>

      {formData.has_irs_pin === 'yes' && (
        <div className="space-y-2">
          <Label htmlFor="irs_pin">{t('irsPinNumber')}</Label>
          <Input
            id="irs_pin"
            name="irs_pin"
            type="text"
            maxLength={6}
            value={formData.irs_pin}
            onChange={handleInputChange}
            className="text-lg p-6"
            placeholder={t('irsPinPlaceholder')}
          />
        </div>
      )}
    </div>
  );
}

// Combined page for desktop
function TaxCreditsAndPinPage({ formData, handleInputChange, setFormData }: FormPageProps) {
  return (
    <div className="space-y-8">
      <TaxCreditsPage formData={formData} setFormData={setFormData} />
      <div className="border-t pt-8">
        <IrsPinPage
          formData={formData}
          handleInputChange={handleInputChange}
          setFormData={setFormData}
        />
      </div>
    </div>
  );
}

function RefundAdvancePage({ formData, setFormData }: Omit<FormPageProps, 'handleInputChange'>) {
  const t = useTranslations('forms.taxIntake.page12');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t('wantsRefundAdvance')} *</Label>
        <Select
          value={formData.wants_refund_advance}
          onValueChange={(value) =>
            setFormData({ ...formData, wants_refund_advance: value as any })
          }
        >
          <SelectTrigger className="text-lg p-6 h-auto">
            <SelectValue placeholder={tCommon('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t('no')}</SelectItem>
            <SelectItem value="yes">{t('yes')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {t('refundAdvanceInfo')}
          </p>
        </div>
      </div>
    </div>
  );
}

function IdDocumentsPage({
  formData,
  handleInputChange,
  handleFileChange,
}: Omit<FormPageWithFileProps, 'setFormData'>) {
  const t = useTranslations('forms.taxIntake.page13');

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="drivers_license">{t('driversLicense')} *</Label>
        <Input
          id="drivers_license"
          name="drivers_license"
          value={formData.drivers_license}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('driversLicensePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_expiration">{t('licenseExpiration')} *</Label>
        <Input
          id="license_expiration"
          name="license_expiration"
          type="date"
          value={formData.license_expiration}
          onChange={handleInputChange}
          required
          className="text-lg p-6"
          placeholder={t('licenseExpirationPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_file">{t('uploadLicense')}</Label>
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
          <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">{t('uploadInstructions')}</p>
          <Input
            id="license_file"
            name="license_file"
            type="file"
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="max-w-xs mx-auto"
          />
          {formData.license_file && (
            <p className="text-sm text-green-600 mt-2">✓ {formData.license_file.name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{t('fileFormatInfo')}</p>
        </div>
      </div>
    </div>
  );
}

function CongratulationsPage({ handleSubmit }: SubmitPageProps) {
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-8 text-center py-8">
      <div className="w-32 h-32 bg-gradient-to-br from-success/20 to-success/10 rounded-full mx-auto flex items-center justify-center">
        <Share2 className="w-16 h-16 text-success" />
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Congratulations!</h2>
        <p className="text-xl text-muted-foreground">You've completed the tax intake form!</p>
      </div>

      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-5xl">💰</div>
          <h3 className="text-2xl font-bold">Earn Money with Referrals!</h3>
          <p className="text-lg leading-relaxed">
            Get <span className="font-bold text-primary">$50 for each person</span> who completes
            their taxes with us.
          </p>
          <p className="text-lg leading-relaxed">
            After your 10th referral, I'll crank it up to{' '}
            <span className="font-bold text-primary">$100 per person!</span>
          </p>
          <div className="pt-4">
            <Button size="lg" variant="outline" asChild>
              <a href="/referral">
                {tCommon('learnMore')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Button size="lg" onClick={handleSubmit} className="mt-8">
        {tCommon('submit')}
        <Upload className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );
}
