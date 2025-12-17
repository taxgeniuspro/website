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

interface CashAdvanceLeadNotificationProps {
  firstName: string;
  phone: string;
  email?: string;
  zipCode: string;
  preferredFiling: string;
  bestTimeToContact: string;
  submittedAt: Date;
  recipientName?: string;
  referralCode?: string;
  preparerName?: string;
}

export function CashAdvanceLeadNotification({
  firstName,
  phone,
  email,
  zipCode,
  preferredFiling,
  bestTimeToContact,
  submittedAt,
  recipientName = 'there',
  referralCode,
  preparerName,
}: CashAdvanceLeadNotificationProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const logoUrl = `${appUrl}/og-image.png`;

  const filingMethodLabel = preferredFiling === 'in-person' ? 'In-Person' : 'Remote / Virtual';
  const contactTimeLabel = bestTimeToContact.charAt(0).toUpperCase() + bestTimeToContact.slice(1);

  return (
    <Html>
      <Head>
        <meta property="og:title" content="Preseason Cash Advance Lead - Tax Genius Pro" />
        <meta property="og:description" content={`New cash advance lead from ${firstName}`} />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={logoUrl} />
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={logoUrl}
              alt="Tax Genius Pro"
              width="60"
              height="60"
              style={{ margin: '0 auto 20px', display: 'block' }}
            />
            <Heading style={h1}>💰 Preseason Cash Advance Lead</Heading>
          </Section>

          <Section style={content}>
            <Text style={greetingText}>Hello {recipientName},</Text>
            <Text style={greetingSubtext}>
              You have a new preseason cash advance lead! This is a high-priority lead — please
              contact them today.
            </Text>

            {/* Urgent Banner */}
            <Section style={urgentBanner}>
              <Text style={urgentText}>
                ⚡ HIGH PRIORITY: Cash Advance Request — Contact within same day
              </Text>
            </Section>

            {/* Lead Name */}
            <Heading style={h2}>{firstName}</Heading>

            {/* Contact Information */}
            <Section style={highlightBox}>
              <Text style={sectionTitle}>Contact Information</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Name:</strong> {firstName}
              </Text>
              <Text style={detailText}>
                <strong>Phone:</strong>{' '}
                <a href={`tel:${phone}`} style={link}>
                  {phone}
                </a>
              </Text>
              {email && (
                <Text style={detailText}>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${email}`} style={link}>
                    {email}
                  </a>
                </Text>
              )}
              <Text style={detailText}>
                <strong>Zip Code:</strong> {zipCode}
              </Text>
            </Section>

            {/* Preferences Box */}
            <Section style={preferencesBox}>
              <Text style={sectionTitle}>Lead Preferences</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Filing Method:</strong> {filingMethodLabel}
              </Text>
              <Text style={detailText}>
                <strong>Best Time to Contact:</strong> {contactTimeLabel}
              </Text>
            </Section>

            {/* Cash Advance Badge */}
            <Section style={serviceBox}>
              <Text style={serviceBadge}>💵 Up to $7,000 Preseason Advance</Text>
            </Section>

            {/* Meta Information */}
            <Section style={metaBox}>
              <Text style={metaText}>
                <strong>Submitted:</strong>{' '}
                {submittedAt.toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                  timeZone: 'America/New_York',
                })}
              </Text>
              {referralCode && (
                <Text style={metaText}>
                  <strong>Referral Code:</strong> {referralCode}
                </Text>
              )}
              {preparerName && (
                <Text style={metaText}>
                  <strong>Assigned To:</strong> {preparerName}
                </Text>
              )}
            </Section>

            {/* Action Items */}
            <Section style={actionBox}>
              <Text style={actionTitle}>📋 Action Items</Text>
              <ul style={actionList}>
                <li style={actionItem}>
                  <strong>Call or text {firstName} TODAY</strong> — this is a hot lead!
                </li>
                <li style={actionItem}>
                  Confirm their documents (W-2s, ID, SSN card)
                </li>
                <li style={actionItem}>
                  Schedule their tax appointment
                </li>
                <li style={actionItem}>
                  Remind them funds are available starting January 2
                </li>
                <li style={actionItem}>
                  Log the interaction in the CRM
                </li>
              </ul>
            </Section>

            {/* Call/Text Buttons */}
            <Section style={buttonContainer}>
              <Button style={buttonPrimary} href={`tel:${phone}`}>
                📞 Call Now
              </Button>
              <Button style={buttonSecondary} href={`sms:${phone}`}>
                💬 Send Text
              </Button>
            </Section>

            {/* Quick Reply Template */}
            <Section style={quickReplySection}>
              <Text style={quickReplyTitle}>📝 Quick Text Template</Text>
              <Text style={quickReplyText}>
                Hi {firstName}! This is {recipientName} from Tax Genius Pro. Thanks for your
                interest in our preseason cash advance — you could qualify for up to $7,000! When
                works best for a quick call to discuss your options? Funds are available starting
                Jan 2. 💰
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={copyright}>© {new Date().getFullYear()} Tax Genius Pro. All rights reserved.</Text>
            <Text style={copyright}>
              This notification was sent to your registered preparer email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
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
  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  padding: '25px',
  borderRadius: '10px 10px 0 0',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '26px',
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
  color: '#059669',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  marginTop: '0',
};

const urgentBanner = {
  backgroundColor: '#fef3c7',
  padding: '14px 18px',
  borderRadius: '6px',
  borderLeft: '4px solid #f59e0b',
  marginBottom: '20px',
};

const urgentText = {
  color: '#92400e',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0',
};

const highlightBox = {
  backgroundColor: '#ecfdf5',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #a7f3d0',
  marginBottom: '15px',
};

const preferencesBox = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #bbf7d0',
  marginBottom: '15px',
};

const sectionTitle = {
  color: '#059669',
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
  borderColor: '#d1fae5',
  margin: '10px 0',
};

const link = {
  color: '#059669',
  textDecoration: 'underline',
};

const serviceBox = {
  textAlign: 'center' as const,
  padding: '15px',
  marginBottom: '20px',
};

const serviceBadge = {
  display: 'inline-block',
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontSize: '18px',
  fontWeight: '600',
  padding: '14px 28px',
  borderRadius: '8px',
  border: '2px solid #86efac',
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

const buttonSecondary = {
  backgroundColor: '#0284c7',
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

const quickReplySection = {
  backgroundColor: '#ecfdf5',
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

export default CashAdvanceLeadNotification;
