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
import { t, commonTranslations, newLeadTranslations, type Locale } from './translations';

interface NewLeadNotificationProps {
  preparerName: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  service: string;
  message?: string;
  source: string;
  dashboardUrl: string;
  leadId: string;
  locale?: Locale;
}

export function NewLeadNotification({
  preparerName,
  leadName,
  leadEmail,
  leadPhone,
  service,
  message,
  source,
  dashboardUrl,
  leadId,
  locale = 'en',
}: NewLeadNotificationProps) {
  // Get translated service label
  const getServiceLabel = (svc: string) => {
    const serviceKey = svc as keyof typeof commonTranslations.services;
    return commonTranslations.services[serviceKey]
      ? t(commonTranslations.services[serviceKey], locale)
      : svc;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const logoUrl = `${appUrl}/og-image.png`;

  return (
    <Html>
      <Head>
        <meta property="og:title" content={t(newLeadTranslations.title, locale)} />
        <meta property="og:description" content={`${t(newLeadTranslations.greeting, locale).replace('{name}', preparerName)} - ${leadName}`} />
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
            <Heading style={h1}>{t(newLeadTranslations.title, locale)}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              {t(newLeadTranslations.greeting, locale).replace('{name}', preparerName)}
            </Text>

            <Section style={serviceBox}>
              <Text style={serviceBadge}>{getServiceLabel(service)}</Text>
            </Section>

            <Section style={infoBox}>
              <Text style={label}>{t(newLeadTranslations.contactInformation, locale)}</Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(commonTranslations.name, locale)}:</strong> {leadName}
              </Text>
              <Text style={detail}>
                <strong>{t(commonTranslations.email, locale)}:</strong>{' '}
                <a href={`mailto:${leadEmail}`} style={link}>
                  {leadEmail}
                </a>
              </Text>
              {leadPhone && (
                <Text style={detail}>
                  <strong>{t(commonTranslations.phone, locale)}:</strong>{' '}
                  <a href={`tel:${leadPhone}`} style={link}>
                    {leadPhone}
                  </a>
                </Text>
              )}
              <Text style={detail}>
                <strong>{t(commonTranslations.source, locale)}:</strong> {source}
              </Text>
            </Section>

            {message && (
              <Section style={messageBox}>
                <Text style={label}>{t(newLeadTranslations.messageLabel, locale)}</Text>
                <Hr style={hr} />
                <Text style={messageText}>&quot;{message}&quot;</Text>
              </Section>
            )}

            <Section style={actionBox}>
              <Button style={btnPrimary} href={dashboardUrl}>
                {t(commonTranslations.viewDashboard, locale)}
              </Button>
              <Button style={btnSecondary} href={`mailto:${leadEmail}`}>
                {t(commonTranslations.emailClient, locale)}
              </Button>
              {leadPhone && (
                <Button style={btnTertiary} href={`tel:${leadPhone}`}>
                  {t(commonTranslations.callClient, locale)}
                </Button>
              )}
            </Section>

            <Text style={footer}>{t(newLeadTranslations.leadId, locale).replace('{id}', leadId)}</Text>
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
  maxWidth: '600px',
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
  margin: '0 0 20px 0',
};

const serviceBox = {
  textAlign: 'center' as const,
  padding: '15px 0',
  marginBottom: '20px',
};

const serviceBadge = {
  display: 'inline-block',
  backgroundColor: '#f9d938',
  color: '#30394b',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  border: '2px solid #30394b',
};

const infoBox = {
  backgroundColor: '#f7f8f8',
  padding: '20px',
  marginBottom: '15px',
  borderLeft: '3px solid #408851',
};

const messageBox = {
  backgroundColor: '#f7f8f8',
  padding: '20px',
  marginBottom: '15px',
  borderLeft: '3px solid #f9d938',
};

const label = {
  color: '#30394b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const hr = {
  borderColor: '#e1eaef',
  margin: '10px 0',
};

const detail = {
  color: '#30394b',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '6px 0',
};

const messageText = {
  color: '#30394b',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
};

const link = {
  color: '#408851',
  textDecoration: 'underline',
};

const actionBox = {
  textAlign: 'center' as const,
  marginTop: '25px',
  marginBottom: '25px',
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

const footer = {
  color: '#72767a',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '20px',
};

export default NewLeadNotification;
