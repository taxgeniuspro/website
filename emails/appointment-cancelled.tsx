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
import { format } from 'date-fns';

interface AppointmentCancelledProps {
  recipientName: string;
  recipientType: 'client' | 'preparer';
  appointmentType: string;
  scheduledFor: Date;
  duration: number;
  preparerName?: string;
  clientName?: string;
  cancelledBy: 'client' | 'preparer' | 'admin';
  reason?: string;
  rebookUrl?: string;
  locale?: 'en' | 'es';
}

const translations = {
  en: {
    subject: 'Appointment Cancelled',
    greeting: (name: string) => `Hi ${name}`,
    cancelledTitle: 'Your Appointment Has Been Cancelled',
    intro: (type: 'client' | 'preparer', otherName?: string, cancelledBy?: string) => {
      if (type === 'client') {
        if (cancelledBy === 'client') {
          return 'Your appointment has been cancelled as requested.';
        }
        return `Your appointment with ${otherName || 'your tax preparer'} has been cancelled.`;
      }
      if (cancelledBy === 'preparer') {
        return 'Your appointment has been cancelled as requested.';
      }
      return `Your appointment with ${otherName || 'your client'} has been cancelled.`;
    },
    scheduledTime: 'Was Scheduled For',
    duration: 'Duration',
    minutes: 'minutes',
    appointmentType: 'Type',
    cancelledByLabel: 'Cancelled By',
    reason: 'Reason',
    rebook: 'Book New Appointment',
    rebookMessage: 'Need to reschedule? You can book a new appointment using the button below.',
    questions: 'If you have any questions, please contact us.',
    copyright: '© 2025 Tax Genius. All rights reserved.',
    cancellerLabels: {
      client: 'Client',
      preparer: 'Tax Preparer',
      admin: 'Administrator',
    },
  },
  es: {
    subject: 'Cita Cancelada',
    greeting: (name: string) => `Hola ${name}`,
    cancelledTitle: 'Su Cita Ha Sido Cancelada',
    intro: (type: 'client' | 'preparer', otherName?: string, cancelledBy?: string) => {
      if (type === 'client') {
        if (cancelledBy === 'client') {
          return 'Su cita ha sido cancelada como solicitó.';
        }
        return `Su cita con ${otherName || 'su preparador de impuestos'} ha sido cancelada.`;
      }
      if (cancelledBy === 'preparer') {
        return 'Su cita ha sido cancelada como solicitó.';
      }
      return `Su cita con ${otherName || 'su cliente'} ha sido cancelada.`;
    },
    scheduledTime: 'Estaba Programada Para',
    duration: 'Duración',
    minutes: 'minutos',
    appointmentType: 'Tipo',
    cancelledByLabel: 'Cancelada Por',
    reason: 'Razón',
    rebook: 'Reservar Nueva Cita',
    rebookMessage: '¿Necesita reprogramar? Puede reservar una nueva cita usando el botón de abajo.',
    questions: 'Si tiene alguna pregunta, por favor contáctenos.',
    copyright: '© 2025 Tax Genius. Todos los derechos reservados.',
    cancellerLabels: {
      client: 'Cliente',
      preparer: 'Preparador de Impuestos',
      admin: 'Administrador',
    },
  },
};

export function AppointmentCancelledEmail({
  recipientName,
  recipientType,
  appointmentType,
  scheduledFor,
  duration,
  preparerName,
  clientName,
  cancelledBy,
  reason,
  rebookUrl,
  locale = 'en',
}: AppointmentCancelledProps) {
  const t = translations[locale] || translations.en;
  const otherName = recipientType === 'client' ? preparerName : clientName;

  const formatDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  };

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Tax Genius</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>{t.greeting(recipientName)}!</Heading>

            <div style={alertBox}>
              <Text style={alertTitle}>{t.cancelledTitle}</Text>
              <Text style={alertText}>{t.intro(recipientType, otherName, cancelledBy)}</Text>
            </div>

            <div style={detailsBox}>
              <table style={table}>
                <tbody>
                  <tr>
                    <td style={labelCell}>{t.scheduledTime}:</td>
                    <td style={{ ...valueCell, textDecoration: 'line-through', color: '#999' }}>
                      {formatDate(scheduledFor)}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>{t.duration}:</td>
                    <td style={valueCell}>{duration} {t.minutes}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>{t.appointmentType}:</td>
                    <td style={valueCell}>{appointmentType}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>{t.cancelledByLabel}:</td>
                    <td style={valueCell}>{t.cancellerLabels[cancelledBy]}</td>
                  </tr>
                  {reason && (
                    <tr>
                      <td style={labelCell}>{t.reason}:</td>
                      <td style={valueCell}>{reason}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {rebookUrl && recipientType === 'client' && (
              <>
                <Text style={rebookText}>{t.rebookMessage}</Text>
                <Section style={buttonContainer}>
                  <Button style={button} href={rebookUrl}>
                    {t.rebook}
                  </Button>
                </Section>
              </>
            )}

            <Text style={note}>{t.questions}</Text>

            <Hr style={hr} />
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
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const alertBox = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #dc2626',
  padding: '15px 20px',
  marginBottom: '20px',
  borderRadius: '4px',
};

const alertTitle = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const alertText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const labelCell = {
  padding: '8px 10px 8px 0',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '14px',
  verticalAlign: 'top' as const,
  width: '140px',
};

const valueCell = {
  padding: '8px 0',
  color: '#111827',
  fontSize: '14px',
};

const rebookText = {
  color: '#333',
  fontSize: '14px',
  marginTop: '20px',
  marginBottom: '10px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '25px 0',
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

export default AppointmentCancelledEmail;
