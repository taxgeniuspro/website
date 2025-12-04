import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  role: 'CLIENT' | 'REFERRER' | 'PREPARER';
  dashboardUrl: string;
}

export function WelcomeEmail({ name, role, dashboardUrl }: WelcomeEmailProps) {
  const roleMessages = {
    CLIENT: 'Get started by uploading your tax documents and connecting with a tax preparer.',
    REFERRER: 'Start earning by sharing your unique referral link and tracking your commissions.',
    PREPARER: 'Begin managing clients and preparing tax returns with our professional tools.',
  };

  const whatNext = {
    CLIENT: ['Upload your tax documents', 'Connect with a certified preparer', 'Track your return status'],
    REFERRER: ['Get your unique referral link', 'Share with friends and family', 'Track your earnings'],
    PREPARER: ['Complete your preparer profile', 'Set your availability', 'Start accepting clients'],
  };

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to Tax Genius!</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>Hi {name}!</Heading>

            <Text style={text}>
              We&apos;re thrilled to have you join the Tax Genius community.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightText}>{roleMessages[role]}</Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Heading style={h3}>What&apos;s Next?</Heading>
            <ul style={list}>
              {whatNext[role].map((item, index) => (
                <li key={index} style={listItem}>
                  {item}
                </li>
              ))}
            </ul>

            <Text style={text}>
              If you have any questions, feel free to reach out to our support team.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>© 2025 Tax Genius. All rights reserved.</Text>
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
  background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
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
  color: '#ff6b35',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const h3 = {
  color: '#ff6b35',
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
  backgroundColor: '#f5f5f5',
  padding: '15px',
  borderRadius: '5px',
  margin: '20px 0',
};

const highlightText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 30px',
};

const list = {
  color: '#666',
  paddingLeft: '20px',
  margin: '15px 0',
};

const listItem = {
  marginBottom: '10px',
  lineHeight: '24px',
};

const footerSection = {
  textAlign: 'center' as const,
  marginTop: '20px',
  padding: '20px',
};

const copyright = {
  color: '#999',
  fontSize: '12px',
  margin: '0',
};

export default WelcomeEmail;
