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

interface PreparerApplicationRejectedProps {
  firstName: string;
  rejectionReason?: string;
  convertedTo?: 'client' | 'affiliate' | null;
  locale?: 'en' | 'es';
}

export function PreparerApplicationRejected({
  firstName,
  rejectionReason,
  convertedTo,
  locale = 'en',
}: PreparerApplicationRejectedProps) {
  const isSpanish = locale === 'es';

  const translations = {
    en: {
      title: 'Application Update',
      greeting: `Dear ${firstName},`,
      mainMessage:
        "Thank you for your interest in joining Tax Genius Pro as a Tax Preparer. After careful review of your application, we regret to inform you that we are unable to move forward with your application at this time.",
      reasonLabel: 'Additional Notes:',
      nextStepsTitle: 'What You Can Do Next',
      clientConversionMessage:
        "While we couldn't offer you a position as a Tax Preparer, we'd love to have you as a client! You can sign up for an account and take advantage of our professional tax preparation services.",
      affiliateConversionMessage:
        "While we couldn't offer you a position as a Tax Preparer, we've converted your application to an Affiliate account. You can earn commissions by referring clients to Tax Genius Pro!",
      noConversionMessage:
        "If you believe your circumstances have changed or you've gained additional experience, you're welcome to apply again in the future.",
      signUpButton: 'Create Client Account',
      affiliateButton: 'Access Affiliate Dashboard',
      reapplyButton: 'Apply Again',
      questionsTitle: 'Questions?',
      questionsMessage:
        "If you have any questions about this decision or would like more information, please don't hesitate to reach out.",
      supportPhone: 'Call us: +1 404-627-1015',
      footer: '© 2025 TaxGeniusPro. All rights reserved.',
      address: '1632 Jonesboro Rd SE, Atlanta, GA 30315',
    },
    es: {
      title: 'Actualización de Solicitud',
      greeting: `Estimado/a ${firstName},`,
      mainMessage:
        'Gracias por su interés en unirse a Tax Genius Pro como Preparador de Impuestos. Después de una revisión cuidadosa de su solicitud, lamentamos informarle que no podemos continuar con su solicitud en este momento.',
      reasonLabel: 'Notas Adicionales:',
      nextStepsTitle: 'Qué Puede Hacer Ahora',
      clientConversionMessage:
        'Aunque no pudimos ofrecerle un puesto como Preparador de Impuestos, nos encantaría tenerlo como cliente. Puede registrarse para una cuenta y aprovechar nuestros servicios profesionales de preparación de impuestos.',
      affiliateConversionMessage:
        'Aunque no pudimos ofrecerle un puesto como Preparador de Impuestos, hemos convertido su solicitud en una cuenta de Afiliado. ¡Puede ganar comisiones refiriendo clientes a Tax Genius Pro!',
      noConversionMessage:
        'Si cree que sus circunstancias han cambiado o ha adquirido experiencia adicional, puede volver a aplicar en el futuro.',
      signUpButton: 'Crear Cuenta de Cliente',
      affiliateButton: 'Acceder al Panel de Afiliados',
      reapplyButton: 'Aplicar de Nuevo',
      questionsTitle: '¿Preguntas?',
      questionsMessage:
        'Si tiene alguna pregunta sobre esta decisión o desea más información, no dude en comunicarse con nosotros.',
      supportPhone: 'Llámenos: +1 404-627-1015',
      footer: '© 2025 TaxGeniusPro. Todos los derechos reservados.',
      address: '1632 Jonesboro Rd SE, Atlanta, GA 30315',
    },
  };

  const t = isSpanish ? translations.es : translations.en;

  const getConversionContent = () => {
    if (convertedTo === 'client') {
      return {
        message: t.clientConversionMessage,
        buttonText: t.signUpButton,
        buttonUrl: 'https://taxgeniuspro.tax/signin',
      };
    }
    if (convertedTo === 'affiliate') {
      return {
        message: t.affiliateConversionMessage,
        buttonText: t.affiliateButton,
        buttonUrl: 'https://taxgeniuspro.tax/signin',
      };
    }
    return {
      message: t.noConversionMessage,
      buttonText: t.reapplyButton,
      buttonUrl: 'https://taxgeniuspro.tax/preparer/apply',
    };
  };

  const conversionContent = getConversionContent();

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
            <Heading style={h1}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting}</Text>

            <Text style={text}>{t.mainMessage}</Text>

            {rejectionReason && (
              <Section style={reasonBox}>
                <Text style={reasonLabel}>{t.reasonLabel}</Text>
                <Text style={reasonText}>{rejectionReason}</Text>
              </Section>
            )}

            <Hr style={hr} />

            <Heading style={h2}>{t.nextStepsTitle}</Heading>

            <Text style={text}>{conversionContent.message}</Text>

            <Section style={buttonContainer}>
              <Button style={button} href={conversionContent.buttonUrl}>
                {conversionContent.buttonText}
              </Button>
            </Section>

            <Hr style={hr} />

            <Heading style={h3}>{t.questionsTitle}</Heading>

            <Text style={text}>{t.questionsMessage}</Text>

            <Section style={contactBox}>
              <Text style={contactText}>{t.supportPhone}</Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={copyright}>{t.footer}</Text>
            <Text style={copyright}>{t.address}</Text>
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

const greeting = {
  color: '#30394b',
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '20px',
};

const h2 = {
  color: '#408851',
  fontSize: '22px',
  fontWeight: 'bold',
  marginTop: '10px',
  marginBottom: '15px',
};

const h3 = {
  color: '#408851',
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '10px',
  marginBottom: '15px',
};

const text = {
  color: '#30394b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '10px 0',
};

const reasonBox = {
  backgroundColor: '#f9fafb',
  padding: '15px 20px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  margin: '20px 0',
};

const reasonLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
  letterSpacing: '0.5px',
};

const reasonText = {
  color: '#30394b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '25px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '25px 0',
};

const button = {
  backgroundColor: '#408851',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 30px',
};

const contactBox = {
  backgroundColor: '#f0fdf4',
  padding: '15px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  margin: '15px 0',
  border: '1px solid #408851',
};

const contactText = {
  color: '#408851',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
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

export default PreparerApplicationRejected;
