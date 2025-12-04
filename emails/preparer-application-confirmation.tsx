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

interface PreparerApplicationConfirmationProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experienceLevel?: string;
  taxSoftware?: string[];
}

export function PreparerApplicationConfirmation({
  firstName,
  lastName,
  email,
  phone,
  experienceLevel,
  taxSoftware,
}: PreparerApplicationConfirmationProps) {
  const experienceLevelLabels: Record<string, string> = {
    NEW: 'New to Tax Preparation - Need Training',
    INTERMEDIATE: '1-3 Years of Experience',
    SEASONED: 'Seasoned Tax Professional (3+ years)',
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
            <Heading style={h1}>Application Received!</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>
              Thank You for Applying, {firstName}!
            </Heading>

            <Text style={text}>
              We&apos;ve received your application to join the Tax Genius team as a Tax Preparer.
              Our hiring team will review your application and get back to you shortly.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>📋 Application Summary</Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Name:</strong> {firstName} {lastName}
              </Text>
              <Text style={detailText}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={detailText}>
                <strong>Phone:</strong> {phone}
              </Text>
              {experienceLevel && (
                <Text style={detailText}>
                  <strong>Experience Level:</strong>{' '}
                  {experienceLevelLabels[experienceLevel] || experienceLevel}
                </Text>
              )}
              {taxSoftware && taxSoftware.length > 0 && (
                <Text style={detailText}>
                  <strong>Tax Software Experience:</strong> {taxSoftware.join(', ')}
                </Text>
              )}
            </Section>

            <Heading style={h3}>What Happens Next?</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>Step 1:</strong> Our hiring team will review your application (1-2 business days)
              </li>
              <li style={listItem}>
                <strong>Step 2:</strong> If qualified, you&apos;ll receive an email to schedule an interview
              </li>
              <li style={listItem}>
                <strong>Step 3:</strong> Complete your interview and background check
              </li>
              <li style={listItem}>
                <strong>Step 4:</strong> Start earning $45-75 per return!
              </li>
            </ul>

            <Section style={infoBox}>
              <Text style={infoText}>
                💡 <strong>Tip:</strong> Check your email regularly (including spam folder) for updates
                from our hiring team.
              </Text>
            </Section>

            <Text style={text}>
              If you have any questions about your application, please reply to this email or call us at
              <strong> +1 404-627-1015</strong>.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>© 2025 TaxGeniusPro. All rights reserved.</Text>
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
  background: 'linear-gradient(135deg, #408851 0%, #5ba568 100%)',
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
  color: '#408851',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const h3 = {
  color: '#408851',
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
  color: '#408851',
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
  backgroundColor: '#eff6ff',
  padding: '15px',
  borderRadius: '5px',
  borderLeft: '4px solid #3b82f6',
  margin: '20px 0',
};

const infoText = {
  color: '#1e40af',
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

export default PreparerApplicationConfirmation;
