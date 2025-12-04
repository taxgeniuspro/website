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

interface MagicLinkEmailProps {
  name?: string;
  magicLinkUrl: string;
}

export function MagicLinkEmail({ name, magicLinkUrl }: MagicLinkEmailProps) {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Tax Genius</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>{greeting}!</Heading>

            <Text style={text}>
              Click the button below to securely log in to your Tax Genius account:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={magicLinkUrl}>
                Log In to Tax Genius
              </Button>
            </Section>

            <Text style={note}>
              This link will expire in 15 minutes for your security.
            </Text>

            <Text style={note}>
              If you didn&apos;t request this login link, you can safely ignore this email.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
              <br />
              <span style={linkText}>{magicLinkUrl}</span>
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

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '25px',
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

const note = {
  color: '#666',
  fontSize: '14px',
  marginTop: '25px',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '25px 0',
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

export default MagicLinkEmail;
