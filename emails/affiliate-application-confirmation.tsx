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
import { t, type Locale, affiliateConfirmationTranslations as trans, commonTranslations } from './translations';

interface AffiliateApplicationConfirmationProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience?: string;
  audience?: string;
  platforms?: string[];
  website?: string;
  locale?: Locale;
}

export function AffiliateApplicationConfirmation({
  firstName,
  lastName,
  email,
  phone,
  experience,
  audience,
  platforms,
  website,
  locale = 'en',
}: AffiliateApplicationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://taxgeniuspro.tax/images/tax-genius-logo.png"
              alt="Tax Genius Pro"
              style={logo}
            />
          </Section>
          <Section style={header}>
            <Heading style={h1}>{t(trans.title, locale)}</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>
              {t(trans.greeting, locale).replace('TaxGeniusPro', firstName)}
            </Heading>

            <Text style={text}>
              {t(trans.receivedMessage, locale)}
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>{t(trans.applicationSummary, locale)}</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>{t(commonTranslations.name, locale)}:</strong> {firstName} {lastName}
              </Text>
              <Text style={detailText}>
                <strong>{t(commonTranslations.email, locale)}:</strong> {email}
              </Text>
              <Text style={detailText}>
                <strong>{t(commonTranslations.phone, locale)}:</strong> {phone}
              </Text>
              {experience && (
                <Text style={detailText}>
                  <strong>{locale === 'es' ? 'Experiencia en Marketing' : 'Marketing Experience'}:</strong> {experience}
                </Text>
              )}
              {audience && (
                <Text style={detailText}>
                  <strong>{locale === 'es' ? 'Audiencia Objetivo' : 'Target Audience'}:</strong> {audience}
                </Text>
              )}
              {platforms && platforms.length > 0 && (
                <Text style={detailText}>
                  <strong>{locale === 'es' ? 'Plataformas' : 'Platforms'}:</strong> {platforms.join(', ')}
                </Text>
              )}
              {website && (
                <Text style={detailText}>
                  <strong>{locale === 'es' ? 'Sitio Web' : 'Website'}:</strong> {website}
                </Text>
              )}
            </Section>

            <Heading style={h3}>{t(trans.whatHappensNext, locale)}</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>{locale === 'es' ? 'Paso 1' : 'Step 1'}:</strong> {t(trans.step1, locale)}
              </li>
              <li style={listItem}>
                <strong>{locale === 'es' ? 'Paso 2' : 'Step 2'}:</strong> {t(trans.step2, locale)}
              </li>
              <li style={listItem}>
                <strong>{locale === 'es' ? 'Paso 3' : 'Step 3'}:</strong> {t(trans.step3, locale)}
              </li>
              <li style={listItem}>
                <strong>{locale === 'es' ? 'Paso 4' : 'Step 4'}:</strong> {t(trans.step4, locale)}
              </li>
            </ul>

            <Section style={infoBox}>
              <Text style={infoText}>
                💡 <strong>{locale === 'es' ? 'Consejo' : 'Tip'}:</strong> {locale === 'es'
                  ? 'Revise su correo regularmente (incluyendo carpeta de spam) para actualizaciones de nuestro equipo de afiliados.'
                  : 'Check your email regularly (including spam folder) for updates from our affiliate team.'}
              </Text>
            </Section>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>{locale === 'es' ? '💰 Estructura de Comisiones' : '💰 Commission Structure'}</Text>
              <Hr style={hr} />
              <ul style={commissionList}>
                <li style={commissionItem}>✓ {locale === 'es' ? 'Gane hasta 20% de comisión en cada referido' : 'Earn up to 20% commission on every referral'}</li>
                <li style={commissionItem}>✓ {locale === 'es' ? 'Comisiones recurrentes para productos de suscripción' : 'Recurring commissions for subscription products'}</li>
                <li style={commissionItem}>✓ {locale === 'es' ? 'Pagos mensuales vía depósito directo' : 'Monthly payouts via direct deposit'}</li>
                <li style={commissionItem}>✓ {locale === 'es' ? 'Panel de seguimiento en tiempo real' : 'Real-time tracking dashboard'}</li>
              </ul>
            </Section>

            <Text style={text}>
              {t(trans.contactUs, locale)} {locale === 'es' ? 'responda a este correo o llámenos al' : 'reply to this email or call us at'}
              <strong> +1 404-627-1015</strong>.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>{t(trans.copyright, locale)}</Text>
            <Text style={copyright}>1632 Jonesboro Rd SE, Atlanta, GA 30315</Text>
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
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '20px 0',
  backgroundColor: '#ffffff',
};

const logo = {
  margin: '0 auto',
  maxWidth: '180px',
  height: 'auto',
};

const header = {
  background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)',
  padding: '30px',
  borderRadius: '10px 10px 0 0',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  border: '1px solid #e0e0e0',
  borderTop: 'none',
  borderRadius: '0 0 10px 10px',
};

const h2 = {
  color: '#9333ea',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const h3 = {
  color: '#9333ea',
  fontSize: '20px',
  fontWeight: 'bold',
  marginTop: '30px',
  marginBottom: '15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '10px 0',
};

const highlightBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  margin: '20px 0',
};

const highlightTitle = {
  color: '#9333ea',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const detailText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '10px 0',
};

const infoBox = {
  backgroundColor: '#faf5ff',
  padding: '15px',
  borderRadius: '5px',
  borderLeft: '4px solid #9333ea',
  margin: '20px 0',
};

const infoText = {
  color: '#6b21a8',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const list = {
  color: '#666',
  paddingLeft: '20px',
  margin: '15px 0',
};

const listItem = {
  marginBottom: '12px',
  lineHeight: '24px',
};

const commissionList = {
  listStyleType: 'none',
  padding: '0',
  margin: '10px 0',
};

const commissionItem = {
  color: '#333',
  fontSize: '14px',
  padding: '6px 0',
  lineHeight: '22px',
};

const footerSection = {
  textAlign: 'center' as const,
  marginTop: '20px',
  padding: '20px',
  borderTop: '1px solid #e0e0e0',
};

const copyright = {
  color: '#999',
  fontSize: '12px',
  margin: '5px 0',
};

export default AffiliateApplicationConfirmation;
