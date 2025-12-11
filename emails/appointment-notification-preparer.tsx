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
import { t, commonTranslations, type Locale } from './translations';

/**
 * Appointment Notification Email Translations
 */
export const appointmentNotificationTranslations = {
  title: {
    en: 'New Appointment Booked',
    es: 'Nueva Cita Programada',
  },
  greeting: {
    en: 'Hi {name},',
    es: 'Hola {name},',
  },
  subtitle: {
    en: 'A client has booked an appointment with you',
    es: 'Un cliente ha programado una cita contigo',
  },
  appointmentDetails: {
    en: 'APPOINTMENT DETAILS',
    es: 'DETALLES DE LA CITA',
  },
  appointmentType: {
    en: 'Type',
    es: 'Tipo',
  },
  scheduledFor: {
    en: 'Scheduled For',
    es: 'Programada Para',
  },
  duration: {
    en: 'Duration',
    es: 'Duración',
  },
  minutes: {
    en: 'minutes',
    es: 'minutos',
  },
  status: {
    en: 'Status',
    es: 'Estado',
  },
  clientInformation: {
    en: 'CLIENT INFORMATION',
    es: 'INFORMACIÓN DEL CLIENTE',
  },
  clientNotes: {
    en: 'CLIENT NOTES',
    es: 'NOTAS DEL CLIENTE',
  },
  viewCalendar: {
    en: 'View Calendar',
    es: 'Ver Calendario',
  },
  appointmentId: {
    en: 'Appointment ID: {id}',
    es: 'ID de Cita: {id}',
  },
  appointmentTypes: {
    PHONE_CALL: {
      en: 'Phone Call',
      es: 'Llamada Telefónica',
    },
    VIDEO_CALL: {
      en: 'Video Call',
      es: 'Videollamada',
    },
    IN_PERSON: {
      en: 'In Person',
      es: 'En Persona',
    },
    CONSULTATION: {
      en: 'Consultation',
      es: 'Consulta',
    },
    FOLLOW_UP: {
      en: 'Follow Up',
      es: 'Seguimiento',
    },
  },
  statusLabels: {
    REQUESTED: {
      en: 'Requested - Awaiting Confirmation',
      es: 'Solicitada - Esperando Confirmación',
    },
    PENDING_APPROVAL: {
      en: 'Pending Your Approval',
      es: 'Pendiente de Tu Aprobación',
    },
    SCHEDULED: {
      en: 'Scheduled',
      es: 'Programada',
    },
    CONFIRMED: {
      en: 'Confirmed',
      es: 'Confirmada',
    },
  },
  actionRequired: {
    en: 'ACTION REQUIRED',
    es: 'ACCIÓN REQUERIDA',
  },
  approvalMessage: {
    en: 'This appointment requires your approval. Please review and confirm in your dashboard.',
    es: 'Esta cita requiere tu aprobación. Por favor revisa y confirma en tu panel.',
  },
};

interface AppointmentNotificationPreparerProps {
  preparerName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  appointmentType: 'PHONE_CALL' | 'VIDEO_CALL' | 'IN_PERSON' | 'CONSULTATION' | 'FOLLOW_UP';
  scheduledFor?: Date | string;
  duration: number;
  status: string;
  clientNotes?: string;
  dashboardUrl: string;
  appointmentId: string;
  locale?: Locale;
}

export function AppointmentNotificationPreparer({
  preparerName,
  clientName,
  clientEmail,
  clientPhone,
  appointmentType,
  scheduledFor,
  duration,
  status,
  clientNotes,
  dashboardUrl,
  appointmentId,
  locale = 'en',
}: AppointmentNotificationPreparerProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const logoUrl = `${appUrl}/og-image.png`;

  // Get appointment type label
  const getAppointmentTypeLabel = (type: string) => {
    const typeKey = type as keyof typeof appointmentNotificationTranslations.appointmentTypes;
    return appointmentNotificationTranslations.appointmentTypes[typeKey]
      ? t(appointmentNotificationTranslations.appointmentTypes[typeKey], locale)
      : type.replace(/_/g, ' ');
  };

  // Get status label
  const getStatusLabel = (s: string) => {
    const statusKey = s as keyof typeof appointmentNotificationTranslations.statusLabels;
    return appointmentNotificationTranslations.statusLabels[statusKey]
      ? t(appointmentNotificationTranslations.statusLabels[statusKey], locale)
      : s;
  };

  // Format date
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return locale === 'es' ? 'Por determinar' : 'To be determined';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale === 'es' ? 'es-US' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const needsApproval = status === 'PENDING_APPROVAL';

  return (
    <Html>
      <Head>
        <meta property="og:title" content={t(appointmentNotificationTranslations.title, locale)} />
        <meta
          property="og:description"
          content={`${t(appointmentNotificationTranslations.greeting, locale).replace('{name}', preparerName)} - ${clientName}`}
        />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={logoUrl} />
      </Head>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              alt="Tax Genius Pro"
              width="60"
              height="60"
              style={{ margin: '0 auto 20px', display: 'block' }}
            />
            <Heading style={h1}>{t(appointmentNotificationTranslations.title, locale)}</Heading>
            <Text style={subtitle}>{t(appointmentNotificationTranslations.subtitle, locale)}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              {t(appointmentNotificationTranslations.greeting, locale).replace(
                '{name}',
                preparerName
              )}
            </Text>

            {/* Action Required Banner (if needs approval) */}
            {needsApproval && (
              <Section style={actionBanner}>
                <Text style={actionBannerTitle}>
                  {t(appointmentNotificationTranslations.actionRequired, locale)}
                </Text>
                <Text style={actionBannerText}>
                  {t(appointmentNotificationTranslations.approvalMessage, locale)}
                </Text>
              </Section>
            )}

            {/* Appointment Type Badge */}
            <Section style={serviceBox}>
              <Text style={serviceBadge}>{getAppointmentTypeLabel(appointmentType)}</Text>
            </Section>

            {/* Appointment Details */}
            <Section style={infoBox}>
              <Text style={label}>
                {t(appointmentNotificationTranslations.appointmentDetails, locale)}
              </Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(appointmentNotificationTranslations.scheduledFor, locale)}:</strong>{' '}
                {formatDate(scheduledFor)}
              </Text>
              <Text style={detail}>
                <strong>{t(appointmentNotificationTranslations.duration, locale)}:</strong>{' '}
                {duration} {t(appointmentNotificationTranslations.minutes, locale)}
              </Text>
              <Text style={detail}>
                <strong>{t(appointmentNotificationTranslations.status, locale)}:</strong>{' '}
                <span style={needsApproval ? statusPending : statusNormal}>
                  {getStatusLabel(status)}
                </span>
              </Text>
            </Section>

            {/* Client Information */}
            <Section style={infoBoxGreen}>
              <Text style={label}>
                {t(appointmentNotificationTranslations.clientInformation, locale)}
              </Text>
              <Hr style={hr} />
              <Text style={detail}>
                <strong>{t(commonTranslations.name, locale)}:</strong> {clientName}
              </Text>
              <Text style={detail}>
                <strong>{t(commonTranslations.email, locale)}:</strong>{' '}
                <a href={`mailto:${clientEmail}`} style={link}>
                  {clientEmail}
                </a>
              </Text>
              {clientPhone && (
                <Text style={detail}>
                  <strong>{t(commonTranslations.phone, locale)}:</strong>{' '}
                  <a href={`tel:${clientPhone}`} style={link}>
                    {clientPhone}
                  </a>
                </Text>
              )}
            </Section>

            {/* Client Notes */}
            {clientNotes && (
              <Section style={messageBox}>
                <Text style={label}>
                  {t(appointmentNotificationTranslations.clientNotes, locale)}
                </Text>
                <Hr style={hr} />
                <Text style={messageText}>&quot;{clientNotes}&quot;</Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section style={actionBox}>
              <Button style={btnPrimary} href={dashboardUrl}>
                {t(appointmentNotificationTranslations.viewCalendar, locale)}
              </Button>
              <Button style={btnSecondary} href={`mailto:${clientEmail}`}>
                {t(commonTranslations.emailClient, locale)}
              </Button>
              {clientPhone && (
                <Button style={btnTertiary} href={`tel:${clientPhone}`}>
                  {t(commonTranslations.callClient, locale)}
                </Button>
              )}
            </Section>

            <Text style={footer}>
              {t(appointmentNotificationTranslations.appointmentId, locale).replace(
                '{id}',
                appointmentId
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f2f7ff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  border: '1px solid #e1eaef',
};

const header = {
  backgroundColor: '#408851',
  padding: '30px 25px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0',
};

const subtitle = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '8px 0 0 0',
  opacity: '0.9',
};

const content = {
  padding: '30px 25px',
};

const greeting = {
  color: '#30394b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 20px 0',
};

const actionBanner = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '15px 20px',
  marginBottom: '20px',
};

const actionBannerTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 5px 0',
  textTransform: 'uppercase' as const,
};

const actionBannerText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
};

const serviceBox = {
  textAlign: 'center' as const,
  padding: '15px 0',
  marginBottom: '20px',
};

const serviceBadge = {
  display: 'inline-block',
  backgroundColor: '#f9d938',
  color: '#30394b',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  border: '2px solid #30394b',
};

const infoBox = {
  backgroundColor: '#f7f8f8',
  padding: '20px',
  marginBottom: '15px',
  borderLeft: '3px solid #30394b',
};

const infoBoxGreen = {
  backgroundColor: '#f7f8f8',
  padding: '20px',
  marginBottom: '15px',
  borderLeft: '3px solid #408851',
};

const messageBox = {
  backgroundColor: '#f7f8f8',
  padding: '20px',
  marginBottom: '15px',
  borderLeft: '3px solid #f9d938',
};

const label = {
  color: '#30394b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const hr = {
  borderColor: '#e1eaef',
  margin: '10px 0',
};

const detail = {
  color: '#30394b',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '6px 0',
};

const messageText = {
  color: '#30394b',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
};

const link = {
  color: '#408851',
  textDecoration: 'underline',
};

const statusPending = {
  color: '#f59e0b',
  fontWeight: '600',
};

const statusNormal = {
  color: '#408851',
};

const actionBox = {
  textAlign: 'center' as const,
  marginTop: '25px',
  marginBottom: '25px',
};

const btnPrimary = {
  backgroundColor: '#408851',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #408851',
};

const btnSecondary = {
  backgroundColor: '#f9d938',
  color: '#30394b',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #30394b',
};

const btnTertiary = {
  backgroundColor: '#30394b',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '5px',
  border: '2px solid #30394b',
};

const footer = {
  color: '#72767a',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '20px',
};

export default AppointmentNotificationPreparer;
