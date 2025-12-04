import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { t, commonTranslations, taxIntakeTranslations, type Locale } from './translations';

interface TaxIntakeCompleteProps {
  preparerName: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  dashboardUrl: string;
  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  ssn: string;
  countryCode: string;
  // Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  // Tax Filing Details
  filingStatus: string;
  employmentType: string;
  occupation: string;
  claimedAsDependent: string;
  // Education
  inCollege: string;
  // Dependents
  hasDependents: string;
  numberOfDependents?: number;
  dependentsUnder24StudentOrDisabled?: string;
  dependentsInCollege?: string;
  childCareProvider?: string;
  // Property
  hasMortgage: string;
  // Tax Credits
  deniedEitc: string;
  // IRS Information
  hasIrsPin: string;
  irsPin?: string;
  // Refund Preferences
  wantsRefundAdvance: string;
  // Identification
  driversLicense: string;
  licenseExpiration: string;
  licenseFileUrl?: string;
  // Attribution
  source: string;
  referrerUsername?: string;
  referrerType?: string;
  attributionMethod?: string;
  // Locale for translations
  locale?: Locale;
  recipientName?: string;
}

export function TaxIntakeComplete(props: TaxIntakeCompleteProps) {
  const {
    preparerName,
    leadName,
    leadEmail,
    leadPhone,
    dashboardUrl,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    ssn,
    countryCode,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    filingStatus,
    employmentType,
    occupation,
    claimedAsDependent,
    inCollege,
    hasDependents,
    numberOfDependents,
    dependentsUnder24StudentOrDisabled,
    dependentsInCollege,
    childCareProvider,
    hasMortgage,
    deniedEitc,
    hasIrsPin,
    irsPin,
    wantsRefundAdvance,
    driversLicense,
    licenseExpiration,
    source,
    referrerUsername,
    locale = 'en',
    recipientName = 'there',
  } = props;

  // Get translated filing status
  const getFilingStatus = (status: string) => {
    const statusKey = status as keyof typeof commonTranslations.filingStatus;
    return commonTranslations.filingStatus[statusKey]
      ? t(commonTranslations.filingStatus[statusKey], locale)
      : status;
  };

  // Get translated employment type
  const getEmployment = (empType: string) => {
    const empKey = empType as keyof typeof commonTranslations.employment;
    return commonTranslations.employment[empKey]
      ? t(commonTranslations.employment[empKey], locale)
      : empType;
  };

  const yesNo = (value: string) => (value === 'yes' ? t(commonTranslations.yes, locale) : t(commonTranslations.no, locale));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const logoUrl = `${appUrl}/og-image.png`;

  return (
    <Html>
      <Head>
        <meta property="og:title" content={t(taxIntakeTranslations.title, locale)} />
        <meta property="og:description" content={`${t(taxIntakeTranslations.greeting, locale).replace('{name}', preparerName)} - ${leadName}`} />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={logoUrl} />
      </Head>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              alt="Tax Genius Pro"
              width="60"
              height="60"
              style={{ margin: '0 auto 20px', display: 'block' }}
            />
            <Heading style={h1}>{t(taxIntakeTranslations.title, locale)}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              {locale === 'es' ? `Hola ${recipientName},` : `Hello ${recipientName},`}
            </Text>
            <Text style={subtext}>
              {locale === 'es'
                ? 'Este es un formulario de preparación de impuestos del sitio web.'
                : 'This is a Tax Preparation form from the website.'}
            </Text>

            {/* Contact Info */}
            <Section style={primaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.clientInformation, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(commonTranslations.name, locale)}:</strong> {firstName}{' '}
                {middleName ? `${middleName} ` : ''}
                {lastName}
              </Text>
              <Text style={detail}>
                <strong>{t(commonTranslations.email, locale)}:</strong>{' '}
                <a href={`mailto:${leadEmail}`} style={link}>
                  {leadEmail}
                </a>
              </Text>
              <Text style={detail}>
                <strong>{t(commonTranslations.phone, locale)}:</strong>{' '}
                <a href={`tel:${leadPhone}`} style={link}>
                  {countryCode} {leadPhone}
                </a>
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.dob, locale)}:</strong> {dateOfBirth}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.ssn, locale)}:</strong> {ssn}
              </Text>
            </Section>

            {/* Address */}
            <Section style={secondaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.address, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>{addressLine1}</Text>
              {addressLine2 && <Text style={detail}>{addressLine2}</Text>}
              <Text style={detail}>
                {city}, {state} {zipCode}
              </Text>
            </Section>

            {/* Tax Filing */}
            <Section style={primaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.taxFiling, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.filingStatus, locale)}:</strong>{' '}
                {getFilingStatus(filingStatus)}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.employment, locale)}:</strong>{' '}
                {getEmployment(employmentType)}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.occupation, locale)}:</strong> {occupation}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.claimedAsDependent, locale)}:</strong>{' '}
                {yesNo(claimedAsDependent)}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.inCollege, locale)}:</strong> {yesNo(inCollege)}
              </Text>
            </Section>

            {/* Dependents */}
            {hasDependents === 'yes' && (
              <Section style={secondaryBox}>
                <Text style={boxLabel}>{t(taxIntakeTranslations.dependents, locale)}</Text>
                <Hr style={hr} />
                <Text style={detail}>
                  <strong>{t(taxIntakeTranslations.number, locale)}:</strong> {numberOfDependents || 0}
                </Text>
                {dependentsUnder24StudentOrDisabled && (
                  <Text style={detail}>
                    <strong>{t(taxIntakeTranslations.under24StudentDisabled, locale)}:</strong>{' '}
                    {yesNo(dependentsUnder24StudentOrDisabled)}
                  </Text>
                )}
                {dependentsInCollege && (
                  <Text style={detail}>
                    <strong>{t(taxIntakeTranslations.dependentsInCollege, locale)}:</strong>{' '}
                    {yesNo(dependentsInCollege)}
                  </Text>
                )}
                {childCareProvider && (
                  <Text style={detail}>
                    <strong>{t(taxIntakeTranslations.childCareProvider, locale)}:</strong>{' '}
                    {yesNo(childCareProvider)}
                  </Text>
                )}
              </Section>
            )}

            {/* Property & Credits */}
            <Section style={primaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.propertyCredits, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.hasMortgage, locale)}:</strong>{' '}
                {yesNo(hasMortgage)}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.deniedEitc, locale)}:</strong> {yesNo(deniedEitc)}
              </Text>
            </Section>

            {/* IRS & Refund */}
            <Section style={secondaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.irsRefund, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.hasIrsPin, locale)}:</strong>{' '}
                {hasIrsPin === 'yes'
                  ? t(taxIntakeTranslations.irsPinYes, locale).replace('{pin}', irsPin || '')
                  : hasIrsPin === 'yes_locate'
                  ? t(taxIntakeTranslations.irsPinLocate, locale)
                  : t(commonTranslations.no, locale)}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.wantsRefundAdvance, locale)}:</strong>{' '}
                {yesNo(wantsRefundAdvance)}
              </Text>
            </Section>

            {/* ID */}
            <Section style={primaryBox}>
              <Text style={boxLabel}>{t(taxIntakeTranslations.identification, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.driversLicense, locale)}:</strong> {driversLicense}
              </Text>
              <Text style={detail}>
                <strong>{t(taxIntakeTranslations.expiration, locale)}:</strong> {licenseExpiration}
              </Text>
            </Section>

            {/* Attribution */}
            {referrerUsername && (
              <Section style={metaBox}>
                <Text style={metaText}>
                  <strong>{t(commonTranslations.source, locale)}:</strong> {source} |{' '}
                  <strong>{t(taxIntakeTranslations.referrer, locale)}:</strong> {referrerUsername}
                </Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section style={actionBox}>
              <Button style={btnPrimary} href={dashboardUrl}>
                {t(commonTranslations.viewDashboard, locale)}
              </Button>
              <Button style={btnSecondary} href={`mailto:${leadEmail}`}>
                {t(commonTranslations.emailClient, locale)}
              </Button>
              <Button style={btnTertiary} href={`tel:${leadPhone}`}>
                {t(commonTranslations.callClient, locale)}
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f2f7ff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '650px',
  border: '1px solid #e1eaef',
};

const header = {
  backgroundColor: '#408851',
  padding: '30px 25px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0',
};

const content = {
  padding: '30px 25px',
};

const greeting = {
  color: '#30394b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const subtext = {
  color: '#72767a',
  fontSize: '14px',
  margin: '5px 0 25px 0',
};

const primaryBox = {
  backgroundColor: '#f7f8f8',
  padding: '18px',
  marginBottom: '12px',
  borderLeft: '3px solid #408851',
};

const secondaryBox = {
  backgroundColor: '#f7f8f8',
  padding: '18px',
  marginBottom: '12px',
  borderLeft: '3px solid #f9d938',
};

const metaBox = {
  backgroundColor: '#f2f7ff',
  padding: '12px 18px',
  marginBottom: '20px',
  borderLeft: '3px solid #30394b',
};

const boxLabel = {
  color: '#30394b',
  fontSize: '12px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  letterSpacing: '1px',
};

const hr = {
  borderColor: '#e1eaef',
  margin: '8px 0',
};

const detail = {
  color: '#30394b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const metaText = {
  color: '#72767a',
  fontSize: '12px',
  margin: '0',
};

const link = {
  color: '#408851',
  textDecoration: 'underline',
};

const actionBox = {
  textAlign: 'center' as const,
  marginTop: '25px',
};

const btnPrimary = {
  backgroundColor: '#408851',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #408851',
};

const btnSecondary = {
  backgroundColor: '#f9d938',
  color: '#30394b',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #30394b',
};

const btnTertiary = {
  backgroundColor: '#30394b',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #30394b',
};

export default TaxIntakeComplete;
