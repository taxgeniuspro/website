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

interface StatusUpdateEmailProps {
  name: string;
  status: string;
  message: string;
  dashboardUrl: string;
}

export function StatusUpdateEmail({
  name,
  status,
  message,
  dashboardUrl,
}: StatusUpdateEmailProps) {
  // Determine status color and icon
  const getStatusStyle = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('filed')) {
      return { color: '#10b981', icon: '✅' };
    } else if (statusLower.includes('progress') || statusLower.includes('reviewing')) {
      return { color: '#f59e0b', icon: '⏳' };
    } else if (statusLower.includes('pending') || statusLower.includes('waiting')) {
      return { color: '#3b82f6', icon: '📋' };
    }
    return { color: '#ff6b35', icon: '📄' };
  };

  const statusStyle = getStatusStyle(status);

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, background: `linear-gradient(135deg, ${statusStyle.color} 0%, ${statusStyle.color}dd 100%)` }}>
            <Heading style={h1}>Tax Return Update {statusStyle.icon}</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>Hi {name}!</Heading>

            <Text style={text}>
              We have an update on your tax return status:
            </Text>

            <Section style={statusBox}>
              <Text style={statusLabel}>Current Status</Text>
              <Text style={{ ...statusValue, color: statusStyle.color }}>
                {status}
              </Text>
            </Section>

            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View Dashboard
              </Button>
            </Section>

            <Text style={noteText}>
              You can check your dashboard anytime for the latest updates on your tax return.
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
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '15px 0',
};

const statusBox = {
  backgroundColor: '#f9fafb',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '25px 0',
};

const statusLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 10px 0',
};

const statusValue = {
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '10px 0 0 0',
};

const messageBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const messageText = {
  color: '#1e40af',
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

const noteText = {
  color: '#666',
  fontSize: '14px',
  textAlign: 'center' as const,
  marginTop: '20px',
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

export default StatusUpdateEmail;
