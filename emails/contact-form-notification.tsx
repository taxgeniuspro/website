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
import { t, commonTranslations, contactFormTranslations, type Locale } from './translations';

interface ContactFormNotificationProps {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
  submittedAt: Date;
  locale?: Locale;
  recipientName?: string;
}

export function ContactFormNotification({
  name,
  email,
  phone,
  service,
  message,
  submittedAt,
  locale = 'en',
  recipientName = 'there',
}: ContactFormNotificationProps) {
  const serviceEmoji: Record<string, string> = {
    individual: '👤',
    business: '🏢',
    'real-estate': '🏘️',
    'audit-defense': '🛡️',
    'tax-planning': '📊',
  };

  // Get translated service label
  const getServiceLabel = (svc: string) => {
    const serviceKey = svc as keyof typeof commonTranslations.services;
    return commonTranslations.services[serviceKey]
      ? t(commonTranslations.services[serviceKey], locale)
      : svc;
  };

  const firstName = name.split(' ')[0];
  const serviceLabel = getServiceLabel(service);
  const phoneText = phone
    ? t(contactFormTranslations.atPhone, locale).replace('{phone}', phone)
    : t(contactFormTranslations.thisWeek, locale);

  const quickReply = t(contactFormTranslations.quickReplyTemplate, locale)
    .replace('{firstName}', firstName)
    .replace('{service}', serviceLabel.toLowerCase())
    .replace('{phoneText}', phoneText);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const logoUrl = `${appUrl}/og-image.png`;

  return (
    <Html>
      <Head>
        <meta property="og:title" content={t(contactFormTranslations.title, locale)} />
        <meta property="og:description" content={`${t(contactFormTranslations.urgentBanner, locale)} - ${name}`} />
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
            <Heading style={h1}>{t(contactFormTranslations.title, locale)}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greetingText}>
              {locale === 'es' ? `Hola ${recipientName},` : `Hello ${recipientName},`}
            </Text>
            <Text style={greetingSubtext}>
              {locale === 'es'
                ? 'Este es un formulario de preparación de impuestos del sitio web.'
                : 'This is a Tax Preparation form from the website.'}
            </Text>

            <Section style={urgentBanner}>
              <Text style={urgentText}>{t(contactFormTranslations.urgentBanner, locale)}</Text>
            </Section>

            <Heading style={h2}>{name}</Heading>

            <Section style={highlightBox}>
              <Text style={sectionTitle}>{t(contactFormTranslations.contactInformation, locale)}</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>{t(commonTranslations.name, locale)}:</strong> {name}
              </Text>
              <Text style={detailText}>
                <strong>{t(commonTranslations.email, locale)}:</strong>{' '}
                <a href={`mailto:${email}`} style={link}>
                  {email}
                </a>
              </Text>
              {phone && (
                <Text style={detailText}>
                  <strong>{t(commonTranslations.phone, locale)}:</strong>{' '}
                  <a href={`tel:${phone}`} style={link}>
                    {phone}
                  </a>
                </Text>
              )}
            </Section>

            <Section style={serviceBox}>
              <Text style={serviceBadge}>
                {serviceEmoji[service] || '📋'} {serviceLabel}
              </Text>
            </Section>

            <Section style={messageBox}>
              <Text style={sectionTitle}>{t(contactFormTranslations.messageLabel, locale)}</Text>
              <Hr style={hr} />
              <Text style={messageText}>&quot;{message}&quot;</Text>
            </Section>

            <Section style={metaBox}>
              <Text style={metaText}>
                <strong>{t(contactFormTranslations.submittedLabel, locale)}:</strong>{' '}
                {submittedAt.toLocaleString(locale === 'es' ? 'es-US' : 'en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                  timeZone: 'America/New_York',
                })}
              </Text>
              <Text style={metaText}>
                <strong>{t(contactFormTranslations.sourceLabel, locale)}:</strong>{' '}
                {t(contactFormTranslations.sourcePage, locale)}
              </Text>
            </Section>

            <Section style={actionBox}>
              <Text style={actionTitle}>{t(contactFormTranslations.recommendedActions, locale)}</Text>
              <ul style={actionList}>
                <li style={actionItem}>
                  <strong>{t(contactFormTranslations.action1, locale)}</strong>
                </li>
                <li style={actionItem}>
                  {phone
                    ? t(contactFormTranslations.action2, locale).replace('{phone}', phone)
                    : t(contactFormTranslations.action2NoPhone, locale)}
                </li>
                <li style={actionItem}>
                  {t(contactFormTranslations.action3, locale).replace('{service}', serviceLabel.toLowerCase())}
                </li>
                <li style={actionItem}>{t(contactFormTranslations.action4, locale)}</li>
                <li style={actionItem}>{t(contactFormTranslations.action5, locale)}</li>
              </ul>
            </Section>

            <Section style={buttonContainer}>
              <Button style={buttonPrimary} href={`mailto:${email}`}>
                {t(commonTranslations.replyViaEmail, locale)}
              </Button>
              {phone && (
                <Button style={buttonSecondary} href={`tel:${phone}`}>
                  {t(commonTranslations.callNow, locale)}
                </Button>
              )}
            </Section>

            <Section style={quickReply}>
              <Text style={quickReplyTitle}>{t(contactFormTranslations.quickReplyTitle, locale)}</Text>
              <Text style={quickReplyText}>{quickReply}</Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>{t(commonTranslations.copyright, locale)}</Text>
            <Text style={copyright}>
              {t(contactFormTranslations.notificationSentTo, locale).replace(
                '{email}',
                'taxgenius.tax@gmail.com'
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '650px',
};

const header = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  padding: '25px',
  borderRadius: '10px 10px 0 0',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  border: '1px solid #e0e0e0',
  borderTop: 'none',
  borderRadius: '0 0 10px 10px',
};

const greetingText = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '8px',
  marginTop: '0',
};

const greetingSubtext = {
  color: '#6b7280',
  fontSize: '15px',
  marginBottom: '20px',
  marginTop: '0',
};

const h2 = {
  color: '#6d28d9',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  marginTop: '0',
};

const urgentBanner = {
  backgroundColor: '#fef3c7',
  padding: '12px 15px',
  borderRadius: '6px',
  borderLeft: '4px solid #f59e0b',
  marginBottom: '20px',
};

const urgentText = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const highlightBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  marginBottom: '15px',
};

const sectionTitle = {
  color: '#6d28d9',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const detailText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '6px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '10px 0',
};

const link = {
  color: '#7c3aed',
  textDecoration: 'underline',
};

const serviceBox = {
  textAlign: 'center' as const,
  padding: '15px',
  marginBottom: '20px',
};

const serviceBadge = {
  display: 'inline-block',
  backgroundColor: '#ede9fe',
  color: '#6d28d9',
  fontSize: '18px',
  fontWeight: '600',
  padding: '12px 24px',
  borderRadius: '8px',
  border: '2px solid #c4b5fd',
};

const messageBox = {
  backgroundColor: '#faf5ff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e9d5ff',
  marginBottom: '15px',
};

const messageText = {
  color: '#581c87',
  fontSize: '15px',
  lineHeight: '24px',
  fontStyle: 'italic',
  margin: '10px 0',
};

const metaBox = {
  backgroundColor: '#f8fafc',
  padding: '12px 15px',
  borderRadius: '6px',
  marginBottom: '20px',
};

const metaText = {
  color: '#64748b',
  fontSize: '13px',
  margin: '5px 0',
};

const actionBox = {
  backgroundColor: '#eff6ff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #bfdbfe',
  marginTop: '20px',
  marginBottom: '20px',
};

const actionTitle = {
  color: '#1e40af',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const actionList = {
  color: '#1e3a8a',
  fontSize: '14px',
  paddingLeft: '20px',
  margin: '10px 0',
};

const actionItem = {
  marginBottom: '10px',
  lineHeight: '22px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '20px',
  marginBottom: '20px',
};

const buttonPrimary = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '0 8px',
};

const buttonSecondary = {
  backgroundColor: '#059669',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '0 8px',
};

const quickReply = {
  backgroundColor: '#f0fdf4',
  padding: '15px',
  borderRadius: '6px',
  marginTop: '20px',
};

const quickReplyTitle = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const quickReplyText = {
  color: '#047857',
  fontSize: '13px',
  lineHeight: '20px',
  fontFamily: 'monospace',
  margin: '10px 0',
  backgroundColor: '#ffffff',
  padding: '12px',
  borderRadius: '4px',
  border: '1px solid #d1fae5',
};

const footerSection = {
  textAlign: 'center' as const,
  marginTop: '20px',
  padding: '20px',
  borderTop: '1px solid #e5e7eb',
};

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '5px 0',
};

export default ContactFormNotification;
