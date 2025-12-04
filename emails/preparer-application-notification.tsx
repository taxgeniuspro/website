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

interface PreparerApplicationNotificationProps {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  languages: string;
  experienceLevel?: string;
  taxSoftware?: string[];
  applicationId: string;
}

export function PreparerApplicationNotification({
  firstName,
  middleName,
  lastName,
  email,
  phone,
  languages,
  experienceLevel,
  taxSoftware,
  applicationId,
}: PreparerApplicationNotificationProps) {
  const experienceLevelLabels: Record<string, string> = {
    NEW: 'New to Tax Preparation - Need Training',
    INTERMEDIATE: '1-3 Years of Experience',
    SEASONED: 'Seasoned Tax Professional (3+ years)',
  };

  const experienceIcon: Record<string, string> = {
    NEW: '🌱',
    INTERMEDIATE: '📈',
    SEASONED: '⭐',
  };

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
            <Heading style={h1}>🎯 New Tax Preparer Application</Heading>
          </Section>

          <Section style={content}>
            <Section style={urgentBanner}>
              <Text style={urgentText}>
                ⏰ New application requires review - Please respond within 1-2 business days
              </Text>
            </Section>

            <Heading style={h2}>
              {firstName} {middleName && `${middleName} `}
              {lastName}
            </Heading>

            <Section style={highlightBox}>
              <Text style={sectionTitle}>📞 Contact Information</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Email:</strong> <a href={`mailto:${email}`} style={link}>{email}</a>
              </Text>
              <Text style={detailText}>
                <strong>Phone:</strong> <a href={`tel:${phone}`} style={link}>{phone}</a>
              </Text>
              <Text style={detailText}>
                <strong>Languages:</strong> {languages}
              </Text>
            </Section>

            {experienceLevel && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>
                  {experienceIcon[experienceLevel] || '💼'} Experience Level
                </Text>
                <Hr style={hr} />
                <Text style={badgeText}>
                  {experienceLevelLabels[experienceLevel] || experienceLevel}
                </Text>
              </Section>
            )}

            {taxSoftware && taxSoftware.length > 0 && (
              <Section style={highlightBox}>
                <Text style={sectionTitle}>💻 Tax Software Experience</Text>
                <Hr style={hr} />
                <ul style={softwareList}>
                  {taxSoftware.map((software, index) => (
                    <li key={index} style={softwareItem}>
                      ✓ {software}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section style={highlightBox}>
              <Text style={sectionTitle}>🔍 Application Details</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Application ID:</strong> {applicationId}
              </Text>
              <Text style={detailText}>
                <strong>Submitted:</strong> {new Date().toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </Text>
            </Section>

            <Section style={actionBox}>
              <Text style={actionTitle}>⚡ Next Steps</Text>
              <ul style={actionList}>
                <li style={actionItem}>Review applicant qualifications</li>
                <li style={actionItem}>Check experience level and software proficiency</li>
                <li style={actionItem}>
                  Contact applicant at {phone} or {email}
                </li>
                <li style={actionItem}>Schedule interview if qualified</li>
              </ul>
              <Section style={buttonContainer}>
                <Button
                  style={button}
                  href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/admin/database?search=${email}`}
                >
                  View in Admin Dashboard
                </Button>
              </Section>
            </Section>

            <Section style={quickReply}>
              <Text style={quickReplyTitle}>📧 Quick Reply Templates</Text>
              <Text style={quickReplyText}>
                <strong>To Schedule Interview:</strong>
                <br />
                &quot;Thank you for applying! We&apos;d like to schedule an interview. Please use this link to book a time...&quot;
              </Text>
              <Text style={quickReplyText}>
                <strong>To Request More Info:</strong>
                <br />
                &quot;Thank you for your application. We&apos;d like to learn more about your experience with...&quot;
              </Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>© 2025 TaxGeniusPro Hiring Team</Text>
            <Text style={copyright}>This email was sent to taxgenius.tax+hire@gmail.com</Text>
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
  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
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

const h2 = {
  color: '#1e40af',
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
  marginBottom: '20px',
};

const sectionTitle = {
  color: '#1e40af',
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

const badgeText = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  padding: '8px 12px',
  backgroundColor: '#d1fae5',
  borderRadius: '6px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '10px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const softwareList = {
  listStyleType: 'none',
  padding: '0',
  margin: '10px 0',
};

const softwareItem = {
  color: '#374151',
  fontSize: '14px',
  padding: '6px 0',
  borderBottom: '1px solid #f3f4f6',
};

const actionBox = {
  backgroundColor: '#eff6ff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #bfdbfe',
  marginTop: '20px',
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
  marginBottom: '8px',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '20px',
};

const button = {
  backgroundColor: '#2563eb',
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

export default PreparerApplicationNotification;
