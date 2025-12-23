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

interface EmailVerificationProps {
  name?: string;
  verificationUrl: string;
  locale?: 'en' | 'es';
}

const translations = {
  en: {
    greeting: (name?: string) => (name ? `Hi ${name}` : 'Hi there'),
    title: 'Verify Your Email',
    intro: 'Welcome to Tax Genius! Please verify your email address by clicking the button below:',
    buttonText: 'Verify Email Address',
    expiry: 'This link will expire in 24 hours for your security.',
    ignore: "If you didn't create an account with Tax Genius, you can safely ignore this email.",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
    copyright: '© 2025 Tax Genius. All rights reserved.',
  },
  es: {
    greeting: (name?: string) => (name ? `Hola ${name}` : 'Hola'),
    title: 'Verifica Tu Correo Electrónico',
    intro: '¡Bienvenido a Tax Genius! Por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:',
    buttonText: 'Verificar Correo Electrónico',
    expiry: 'Este enlace expirará en 24 horas por tu seguridad.',
    ignore: 'Si no creaste una cuenta con Tax Genius, puedes ignorar este correo de forma segura.',
    fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
    copyright: '© 2025 Tax Genius. Todos los derechos reservados.',
  },
};

export function EmailVerificationEmail({ name, verificationUrl, locale = 'en' }: EmailVerificationProps) {
  const t = translations[locale] || translations.en;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Tax Genius</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>{t.greeting(name)}!</Heading>

            <Text style={titleText}>{t.title}</Text>

            <Text style={text}>{t.intro}</Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                {t.buttonText}
              </Button>
            </Section>

            <Text style={note}>{t.expiry}</Text>

            <Text style={note}>{t.ignore}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              {t.fallback}
              <br />
              <span style={linkText}>{verificationUrl}</span>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>{t.copyright}</Text>
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

const titleText = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '15px',
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

export default EmailVerificationEmail;
