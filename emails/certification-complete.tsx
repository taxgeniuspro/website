import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface CertificationCompleteEmailProps {
  preparerName: string
  dashboardUrl?: string
}

export const CertificationCompleteEmail = ({
  preparerName = 'Tax Preparer',
  dashboardUrl = 'https://taxgeniuspro.tax/app/academy',
}: CertificationCompleteEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Congratulations! You&apos;ve completed all required training materials</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🎓 Certification Training Complete!</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {preparerName},</Text>

            <Text style={paragraph}>
              <strong>Congratulations!</strong> You&apos;ve successfully completed all required training materials for the Tax Genius Academy certification program.
            </Text>

            <Text style={paragraph}>
              Your certification status has been updated to <strong>Pending Review</strong>. Our team will review your training completion and contact you within 2-3 business days with next steps.
            </Text>

            {/* Next Steps */}
            <Section style={boxSection}>
              <Heading as="h2" style={h2}>What Happens Next?</Heading>

              <Text style={listItem}>
                <strong>1. Manual Review:</strong> Our training coordinators will verify your completed materials
              </Text>

              <Text style={listItem}>
                <strong>2. Certification Interview:</strong> You&apos;ll be scheduled for a brief knowledge verification call
              </Text>

              <Text style={listItem}>
                <strong>3. Final Certification:</strong> Upon passing the interview, you&apos;ll receive your official Tax Genius Preparer certification
              </Text>
            </Section>

            {/* Call to Action */}
            <Section style={ctaSection}>
              <Text style={paragraph}>
                View your certification status and training progress in your Academy dashboard:
              </Text>

              <Link href={dashboardUrl} style={button}>
                View Academy Dashboard
              </Link>
            </Section>

            {/* Additional Info */}
            <Text style={paragraph}>
              While you wait for your certification review, you can access optional training materials to further enhance your skills.
            </Text>

            <Text style={paragraph}>
              If you have any questions about the certification process, please don&apos;t hesitate to contact our support team.
            </Text>

            <Text style={signature}>
              Best regards,<br />
              The Tax Genius Academy Team
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Tax Genius Pro | Professional Tax Preparation Platform
            </Text>
            <Text style={footerText}>
              This email was sent because you completed required training materials in the Tax Genius Academy.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default CertificationCompleteEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 24px',
  backgroundColor: '#ff6b35',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const content = {
  padding: '0 24px',
}

const greeting = {
  fontSize: '18px',
  lineHeight: '24px',
  margin: '24px 0',
  color: '#333333',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  color: '#555555',
}

const h2 = {
  color: '#333333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
}

const boxSection = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const listItem = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
  color: '#555555',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  margin: '16px 0',
}

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 24px',
  color: '#555555',
  fontStyle: 'italic' as const,
}

const footer = {
  borderTop: '1px solid #e6e6e6',
  padding: '24px',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#999999',
  margin: '8px 0',
}
