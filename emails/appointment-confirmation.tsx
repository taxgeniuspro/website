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

interface AppointmentConfirmationProps {
  clientName: string;
  clientEmail: string;
  appointmentType: string;
  scheduledFor?: Date;
  notes?: string;
  preparerName?: string;
}

export function AppointmentConfirmation({
  clientName,
  clientEmail,
  appointmentType,
  scheduledFor,
  notes,
  preparerName,
}: AppointmentConfirmationProps) {
  const typeLabels: Record<string, string> = {
    TAX_CONSULTATION: 'Tax Consultation',
    PREPARER_INTERVIEW: 'Preparer Interview',
    DOCUMENT_REVIEW: 'Document Review',
    FOLLOW_UP: 'Follow-up Meeting',
    GENERAL: 'General Inquiry',
  };

  const typeEmoji: Record<string, string> = {
    TAX_CONSULTATION: '💼',
    PREPARER_INTERVIEW: '👔',
    DOCUMENT_REVIEW: '📋',
    FOLLOW_UP: '🔄',
    GENERAL: '💬',
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
            <Heading style={h1}>📅 Appointment Confirmed!</Heading>
          </Section>

          <Section style={content}>
            <Section style={successBanner}>
              <Text style={successText}>
                ✅ Your appointment request has been received successfully!
              </Text>
            </Section>

            <Heading style={h2}>Hi {clientName.split(' ')[0]}!</Heading>

            <Text style={text}>
              Thank you for scheduling an appointment with TaxGeniusPro. We&apos;ve received your
              request and our team will confirm the details shortly.
            </Text>

            <Section style={appointmentBox}>
              <Text style={appointmentTitle}>
                {typeEmoji[appointmentType] || '📅'} Appointment Details
              </Text>
              <Hr style={hr} />
              <Text style={detailText}>
                <strong>Type:</strong> {typeLabels[appointmentType] || appointmentType}
              </Text>
              <Text style={detailText}>
                <strong>Requested By:</strong> {clientName}
              </Text>
              <Text style={detailText}>
                <strong>Email:</strong> {clientEmail}
              </Text>
              {scheduledFor && (
                <Text style={detailText}>
                  <strong>Preferred Date/Time:</strong>{' '}
                  {scheduledFor.toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: 'America/New_York',
                  })}{' '}
                  EST
                </Text>
              )}
              {preparerName && (
                <Text style={detailText}>
                  <strong>Tax Professional:</strong> {preparerName}
                </Text>
              )}
              {notes && (
                <>
                  <Hr style={hr} />
                  <Text style={notesLabel}>📝 Your Notes:</Text>
                  <Text style={notesText}>&quot;{notes}&quot;</Text>
                </>
              )}
            </Section>

            <Section style={nextStepsBox}>
              <Text style={nextStepsTitle}>🎯 What Happens Next?</Text>
              <ul style={stepsList}>
                <li style={stepItem}>
                  <strong>Within 2 hours:</strong> Our team will review your request
                </li>
                <li style={stepItem}>
                  <strong>Email confirmation:</strong> You&apos;ll receive a confirmation email with the
                  final appointment details
                </li>
                <li style={stepItem}>
                  <strong>Calendar invite:</strong> We&apos;ll send you a calendar invite to add to your
                  schedule
                </li>
                <li style={stepItem}>
                  <strong>Reminder:</strong> You&apos;ll receive a reminder 24 hours before your
                  appointment
                </li>
              </ul>
            </Section>

            {appointmentType === 'TAX_CONSULTATION' && (
              <Section style={prepBox}>
                <Text style={prepTitle}>📋 Prepare for Your Consultation</Text>
                <Text style={prepText}>To make the most of your consultation, please have ready:</Text>
                <ul style={prepList}>
                  <li style={prepItem}>Previous year&apos;s tax return (if available)</li>
                  <li style={prepItem}>Recent pay stubs or income statements</li>
                  <li style={prepItem}>List of questions or concerns</li>
                  <li style={prepItem}>Any relevant tax documents</li>
                </ul>
              </Section>
            )}

            {appointmentType === 'PREPARER_INTERVIEW' && (
              <Section style={prepBox}>
                <Text style={prepTitle}>💼 Prepare for Your Interview</Text>
                <Text style={prepText}>Please have the following ready:</Text>
                <ul style={prepList}>
                  <li style={prepItem}>Resume or work history</li>
                  <li style={prepItem}>Tax preparer certifications (if applicable)</li>
                  <li style={prepItem}>List of tax software you&apos;ve used</li>
                  <li style={prepItem}>Questions about the position</li>
                </ul>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button
                style={buttonPrimary}
                href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/dashboard`}
              >
                View My Dashboard
              </Button>
            </Section>

            <Section style={contactBox}>
              <Text style={contactTitle}>Need to Make Changes?</Text>
              <Text style={contactText}>
                If you need to reschedule or cancel your appointment, please contact us:
                <br />
                📞 <strong>Phone:</strong> +1 404-627-1015
                <br />
                📧 <strong>Email:</strong>{' '}
                <a href="mailto:taxgenius.tax@gmail.com" style={link}>
                  taxgenius.tax@gmail.com
                </a>
              </Text>
            </Section>

            <Text style={text}>
              We look forward to meeting with you and helping you with your tax needs!
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
  maxWidth: '650px',
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
  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
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
  color: '#047857',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '10px',
  marginTop: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '15px 0',
};

const successBanner = {
  backgroundColor: '#d1fae5',
  padding: '12px 15px',
  borderRadius: '6px',
  borderLeft: '4px solid #10b981',
  marginBottom: '20px',
};

const successText = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const appointmentBox = {
  backgroundColor: '#f0fdfa',
  padding: '24px',
  borderRadius: '10px',
  border: '2px solid #99f6e4',
  margin: '25px 0',
};

const appointmentTitle = {
  color: '#047857',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
  textAlign: 'center' as const,
};

const detailText = {
  color: '#065f46',
  fontSize: '15px',
  lineHeight: '26px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#99f6e4',
  margin: '15px 0',
};

const notesLabel = {
  color: '#047857',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '10px 0 5px 0',
};

const notesText = {
  color: '#065f46',
  fontSize: '14px',
  lineHeight: '22px',
  fontStyle: 'italic',
  padding: '12px',
  backgroundColor: '#ecfdf5',
  borderRadius: '6px',
  margin: '5px 0',
};

const nextStepsBox = {
  backgroundColor: '#eff6ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
};

const nextStepsTitle = {
  color: '#1e40af',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const stepsList = {
  color: '#1e3a8a',
  fontSize: '15px',
  paddingLeft: '20px',
  margin: '10px 0',
};

const stepItem = {
  marginBottom: '12px',
  lineHeight: '24px',
};

const prepBox = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #fbbf24',
  margin: '20px 0',
};

const prepTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const prepText = {
  color: '#78350f',
  fontSize: '14px',
  margin: '10px 0',
};

const prepList = {
  color: '#78350f',
  fontSize: '14px',
  paddingLeft: '20px',
  margin: '10px 0',
};

const prepItem = {
  marginBottom: '8px',
  lineHeight: '22px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const buttonPrimary = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const contactBox = {
  backgroundColor: '#f9fafb',
  padding: '15px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  margin: '20px 0',
};

const contactTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const contactText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '5px 0',
};

const link = {
  color: '#10b981',
  textDecoration: 'underline',
};

const footerSection = {
  textAlign: 'center' as const,
  marginTop: '20px',
  padding: '20px',
  borderTop: '1px solid #e5e7eb',
};

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '5px 0',
};

export default AppointmentConfirmation;
