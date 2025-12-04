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
import { t, type Locale, affiliateApplicationTranslations as trans, commonTranslations } from './translations';

interface AffiliateApplicationNotificationProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience?: string;
  audience?: string;
  platforms?: string[];
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  message?: string;
  bondedPreparerId?: string | null;
  leadId: string;
  locale?: Locale;
  recipientName?: string;
}

export function AffiliateApplicationNotification({
  firstName,
  lastName,
  email,
  phone,
  experience,
  audience,
  platforms,
  website,
  socialMedia,
  message,
  bondedPreparerId,
  leadId,
  locale = 'en',
  recipientName = 'there',
}: AffiliateApplicationNotificationProps) {
  const hasSocialMedia = socialMedia && Object.values(socialMedia).some((v) => v);

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
            <Text style={greetingText}>
              {locale === 'es' ? `Hola ${recipientName},` : `Hello ${recipientName},`}
            </Text>
            <Text style={greetingSubtext}>
              {locale === 'es'
                ? 'Este es un formulario de preparación de impuestos del sitio web.'
                : 'This is a Tax Preparation form from the website.'}
            </Text>

            <Section style={urgentBanner}>
              <Text style={urgentText}>
                {t(trans.urgentBanner, locale)}
              </Text>
            </Section>

            <Heading style={h2}>
              {firstName} {lastName}
              {bondedPreparerId && <span style={bondingBadge}>{t(trans.bondingBadge, locale)}</span>}
            </Heading>

            <Section style={highlightBox}>
              <Text style={sectionTitle}>{t(trans.contactInformation, locale)}</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>{t(commonTranslations.email, locale)}:</strong> <a href={`mailto:${email}`} style={link}>{email}</a>
              </Text>
              <Text style={detailText}>
                <strong>{t(commonTranslations.phone, locale)}:</strong> <a href={`tel:${phone}`} style={link}>{phone}</a>
              </Text>
            </Section>

            {(experience || audience) && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>{t(trans.marketingProfile, locale)}</Text>
                <Hr style={hr} />
                {experience && (
                  <Text style={detailText}>
                    <strong>{t(trans.experience, locale)}:</strong> {experience}
                  </Text>
                )}
                {audience && (
                  <Text style={detailText}>
                    <strong>{t(trans.targetAudience, locale)}:</strong> {audience}
                  </Text>
                )}
              </Section>
            )}

            {platforms && platforms.length > 0 && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>{t(trans.marketingPlatforms, locale)}</Text>
                <Hr style={hr} />
                <ul style={platformList}>
                  {platforms.map((platform, index) => (
                    <li key={index} style={platformItem}>
                      ✓ {platform}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {(website || hasSocialMedia) && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>{t(trans.onlinePresence, locale)}</Text>
                <Hr style={hr} />
                {website && (
                  <Text style={detailText}>
                    <strong>{t(trans.website, locale)}:</strong>{' '}
                    <a href={website} style={link} target="_blank" rel="noopener noreferrer">
                      {website}
                    </a>
                  </Text>
                )}
                {hasSocialMedia && (
                  <div style={{ marginTop: '10px' }}>
                    <Text style={detailText}>
                      <strong>{t(trans.socialMedia, locale)}:</strong>
                    </Text>
                    {socialMedia?.facebook && (
                      <Text style={socialText}>
                        • Facebook:{' '}
                        <a href={socialMedia.facebook} style={link} target="_blank" rel="noopener noreferrer">
                          {socialMedia.facebook}
                        </a>
                      </Text>
                    )}
                    {socialMedia?.instagram && (
                      <Text style={socialText}>
                        • Instagram:{' '}
                        <a href={socialMedia.instagram} style={link} target="_blank" rel="noopener noreferrer">
                          {socialMedia.instagram}
                        </a>
                      </Text>
                    )}
                    {socialMedia?.twitter && (
                      <Text style={socialText}>
                        • Twitter:{' '}
                        <a href={socialMedia.twitter} style={link} target="_blank" rel="noopener noreferrer">
                          {socialMedia.twitter}
                        </a>
                      </Text>
                    )}
                    {socialMedia?.tiktok && (
                      <Text style={socialText}>
                        • TikTok:{' '}
                        <a href={socialMedia.tiktok} style={link} target="_blank" rel="noopener noreferrer">
                          {socialMedia.tiktok}
                        </a>
                      </Text>
                    )}
                    {socialMedia?.youtube && (
                      <Text style={socialText}>
                        • YouTube:{' '}
                        <a href={socialMedia.youtube} style={link} target="_blank" rel="noopener noreferrer">
                          {socialMedia.youtube}
                        </a>
                      </Text>
                    )}
                  </div>
                )}
              </Section>
            )}

            {message && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>{t(trans.additionalMessage, locale)}</Text>
                <Hr style={hr} />
                <Text style={messageText}>{message}</Text>
              </Section>
            )}

            {bondedPreparerId && (
              <Section style={bondingBox}>
                <Text style={bondingTitle}>{t(trans.bondingRequestDetails, locale)}</Text>
                <Hr style={hr} />
                <Text style={bondingText}>
                  {t(trans.bondingText1, locale)}{' '}
                  <strong>{bondedPreparerId}</strong>
                </Text>
                <Text style={bondingText}>
                  {t(trans.bondingText2, locale)}
                </Text>
              </Section>
            )}

            <Section style={highlightBox}>
              <Text style={sectionTitle}>{t(trans.applicationDetails, locale)}</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>{t(trans.leadId, locale)}:</strong> {leadId}
              </Text>
              <Text style={detailText}>
                <strong>{t(trans.submitted, locale)}:</strong>{' '}
                {new Date().toLocaleString(locale === 'es' ? 'es-US' : 'en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </Text>
            </Section>

            <Section style={actionBox}>
              <Text style={actionTitle}>{t(trans.nextSteps, locale)}</Text>
              <ul style={actionList}>
                <li style={actionItem}>{t(trans.step1, locale)}</li>
                <li style={actionItem}>{t(trans.step2, locale)}</li>
                <li style={actionItem}>
                  {t(trans.step3, locale).replace('{phone}', phone).replace('{email}', email)}
                </li>
                {bondedPreparerId && (
                  <li style={actionItem}>{t(trans.step4, locale)}</li>
                )}
                <li style={actionItem}>{t(trans.step5, locale)}</li>
              </ul>
              <Section style={buttonContainer}>
                <Button
                  style={button}
                  href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/admin/database?search=${email}`}
                >
                  {t(trans.viewInAdminDashboard, locale)}
                </Button>
              </Section>
            </Section>

            <Section style={quickReply}>
              <Text style={quickReplyTitle}>{t(trans.quickReplyTemplates, locale)}</Text>
              <Text style={quickReplyText}>
                <strong>{t(trans.toApproveApplication, locale)}:</strong>
                <br />
                &quot;{t(trans.approvalTemplate, locale)}&quot;
              </Text>
              <Text style={quickReplyText}>
                <strong>{t(trans.toRequestMoreInfo, locale)}:</strong>
                <br />
                &quot;{t(trans.moreInfoTemplate, locale)}&quot;
              </Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>{t(trans.copyright, locale)}</Text>
            <Text style={copyright}>{t(trans.emailSentTo, locale)}</Text>
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
  color: '#7e22ce',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  marginTop: '0',
};

const bondingBadge = {
  display: 'inline-block',
  backgroundColor: '#fef3c7',
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '6px 12px',
  borderRadius: '6px',
  marginLeft: '12px',
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
  marginBottom: '20px',
};

const bondingBox = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #fbbf24',
  marginBottom: '20px',
};

const bondingTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const bondingText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const sectionTitle = {
  color: '#7e22ce',
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

const socialText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0 4px 10px',
};

const messageText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '10px 0',
};

const link = {
  color: '#9333ea',
  textDecoration: 'underline',
};

const platformList = {
  listStyleType: 'none',
  padding: '0',
  margin: '10px 0',
};

const platformItem = {
  color: '#374151',
  fontSize: '14px',
  padding: '6px 0',
  borderBottom: '1px solid #f3f4f6',
};

const actionBox = {
  backgroundColor: '#faf5ff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e9d5ff',
  marginTop: '20px',
};

const actionTitle = {
  color: '#7e22ce',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const actionList = {
  color: '#6b21a8',
  fontSize: '14px',
  paddingLeft: '20px',
  margin: '10px 0',
};

const actionItem = {
  marginBottom: '8px',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '20px',
};

const button = {
  backgroundColor: '#9333ea',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
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
  margin: '10px 0',
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

export default AffiliateApplicationNotification;
