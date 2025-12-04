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

interface CommissionEmailProps {
  name: string;
  amount: number;
  clientName: string;
  dashboardUrl: string;
}

export function CommissionEmail({
  name,
  amount,
  clientName,
  dashboardUrl,
}: CommissionEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Commission Earned! 💰</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>Congratulations, {name}!</Heading>

            <Section style={amountBox}>
              <Text style={amountLabel}>You&apos;ve earned</Text>
              <Text style={amountValue}>${amount.toFixed(2)}</Text>
              <Text style={amountSubtext}>in commission</Text>
            </Section>

            <Text style={text}>
              Your referral <strong>{clientName}</strong> has completed their tax return.
              This commission has been added to your account balance.
            </Text>

            <Hr style={hr} />

            <Text style={text}>
              Keep up the great work! The more you refer, the more you earn.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View Dashboard
              </Button>
            </Section>

            <Section style={statsBox}>
              <Text style={statsText}>
                Check your dashboard to see your total earnings and referral performance.
              </Text>
            </Section>
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
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
  color: '#10b981',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const amountBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #10b981',
  borderRadius: '10px',
  padding: '30px',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const amountLabel = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 10px 0',
};

const amountValue = {
  color: '#10b981',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '10px 0',
  lineHeight: '1',
};

const amountSubtext = {
  color: '#059669',
  fontSize: '16px',
  margin: '10px 0 0 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '15px 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '25px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 30px',
};

const statsBox = {
  backgroundColor: '#f9fafb',
  padding: '15px',
  borderRadius: '5px',
  marginTop: '20px',
};

const statsText = {
  color: '#666',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
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

export default CommissionEmail;
