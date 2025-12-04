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
} from '@react-email/components';

interface TaxPreparerWelcomeEmailProps {
  name: string;
  email: string;
  trackingCode: string;
  magicLinkUrl: string;
  expiresIn?: string;
}

export function TaxPreparerWelcomeEmail({
  name,
  email,
  trackingCode,
  magicLinkUrl,
  expiresIn = '24 hours',
}: TaxPreparerWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to Tax Genius Pro!</Heading>
            <Text style={headerSubtext}>Your Tax Preparer Account is Ready</Text>
          </Section>

          <Section style={content}>
            <Heading style={h2}>Hi {name}!</Heading>

            <Text style={text}>
              Your Tax Genius Pro tax preparer account has been created. We're excited to have you
              join our professional network of tax preparers!
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightLabel}>Your Tracking Code</Text>
              <Text style={trackingCodeText}>{trackingCode}</Text>
              <Text style={highlightSubtext}>
                Use this code to track referrals and share with clients
              </Text>
            </Section>

            <Heading style={h3}>Set Up Your Password</Heading>

            <Text style={text}>
              To get started, click the button below to create your secure password:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={magicLinkUrl}>
                Set Up My Password
              </Button>
            </Section>

            <Section style={warningBox}>
              <Text style={warningText}>
                ⏱ This setup link will expire in {expiresIn}. Please complete your setup as soon as
                possible.
              </Text>
            </Section>

            <Hr style={hr} />

            <Heading style={h3}>What's Included in Your Account?</Heading>

            <ul style={list}>
              <li style={listItem}>
                <strong>Custom QR Code:</strong> Branded QR code for easy client intake
              </li>
              <li style={listItem}>
                <strong>Referral Tracking:</strong> Monitor client acquisitions and conversions
              </li>
              <li style={listItem}>
                <strong>Marketing Tools:</strong> Professional business cards, postcards, and more
              </li>
              <li style={listItem}>
                <strong>Client Management:</strong> CRM tools to manage your client relationships
              </li>
              <li style={listItem}>
                <strong>Custom Links:</strong> Personalized intake and appointment booking URLs
              </li>
            </ul>

            <Hr style={hr} />

            <Heading style={h3}>Next Steps</Heading>

            <ol style={list}>
              <li style={listItem}>Click the button above to set your password</li>
              <li style={listItem}>Complete your tax preparer profile</li>
              <li style={listItem}>Customize your marketing materials</li>
              <li style={listItem}>Download your QR code and share with clients</li>
              <li style={listItem}>Start managing clients and building your practice</li>
            </ol>

            <Hr style={hr} />

            <Section style={accountBox}>
              <Text style={accountLabel}>Your Account Email</Text>
              <Text style={accountValue}>{email}</Text>
            </Section>

            <Text style={note}>
              If you didn't expect this email or have any questions, please contact our support
              team.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              If the button doesn't work, copy and paste this link into your browser:
              <br />
              <span style={linkText}>{magicLinkUrl}</span>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>© 2025 Tax Genius Pro. All rights reserved.</Text>
            <Text style={footerLinks}>
              Questions? Email us at support@taxgeniuspro.tax
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
  maxWidth: '600px',
};

const header = {
  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
  padding: '40px 30px',
  borderRadius: '10px 10px 0 0',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const headerSubtext = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '16px',
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

const h3 = {
  color: '#1e40af',
  fontSize: '20px',
  fontWeight: 'bold',
  marginTop: '30px',
  marginBottom: '15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '10px 0 20px 0',
};

const highlightBox = {
  backgroundColor: '#eff6ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '25px 0',
  textAlign: 'center' as const,
  border: '2px solid #3b82f6',
};

const highlightLabel = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px 0',
  letterSpacing: '1px',
};

const trackingCodeText = {
  color: '#1e40af',
  fontSize: '32px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  margin: '5px 0',
  letterSpacing: '2px',
};

const highlightSubtext = {
  color: '#64748b',
  fontSize: '14px',
  margin: '10px 0 0 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#1e40af',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  padding: '15px',
  borderRadius: '6px',
  margin: '25px 0',
  border: '1px solid #fbbf24',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
};

const accountBox = {
  backgroundColor: '#f9fafb',
  padding: '15px',
  borderRadius: '6px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const accountLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 5px 0',
  letterSpacing: '1px',
};

const accountValue = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const list = {
  color: '#333',
  paddingLeft: '20px',
  margin: '15px 0',
};

const listItem = {
  marginBottom: '12px',
  lineHeight: '24px',
  fontSize: '15px',
};

const note = {
  color: '#666',
  fontSize: '14px',
  marginTop: '30px',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const footer = {
  color: '#999',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '25px',
};

const linkText = {
  color: '#666',
  wordBreak: 'break-all' as const,
  fontSize: '11px',
};

const footerSection = {
  textAlign: 'center' as const,
  marginTop: '20px',
  padding: '20px',
  backgroundColor: '#f9fafb',
};

const copyright = {
  color: '#999',
  fontSize: '12px',
  margin: '0 0 5px 0',
};

const footerLinks = {
  color: '#666',
  fontSize: '12px',
  margin: '5px 0 0 0',
};

export default TaxPreparerWelcomeEmail;
