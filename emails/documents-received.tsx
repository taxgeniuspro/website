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
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface DocumentsReceivedEmailProps {
  clientName: string
  preparerName: string
  preparerEmail: string
  taxYear: number
  documentCount: number
  dashboardUrl?: string
}

export const DocumentsReceivedEmail = ({
  clientName = 'John Doe',
  preparerName = 'Sarah Johnson',
  preparerEmail = 'sarah@taxgeniuspro.tax',
  taxYear = 2024,
  documentCount = 5,
  dashboardUrl = 'https://taxgeniuspro.tax/dashboard/client',
}: DocumentsReceivedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Your {taxYear} tax documents have been received - {preparerName} from Tax Genius Pro
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Heading style={heading}>Tax Genius Pro</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Documents Received ✓</Heading>

            <Text style={paragraph}>
              Hi {clientName},
            </Text>

            <Text style={paragraph}>
              Great news! We&apos;ve received your {taxYear} tax documents and information.
              Your submission includes <strong>{documentCount} document{documentCount !== 1 ? 's' : ''}</strong>.
            </Text>

            <Text style={paragraph}>
              {preparerName}, your dedicated tax preparer from Tax Genius Pro, will review
              your submission and begin preparing your return. You&apos;ll receive another update
              when your return has been filed.
            </Text>

            {/* Info Box */}
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Your Preparer:</strong> {preparerName}<br />
                <strong>Tax Year:</strong> {taxYear}<br />
                <strong>Documents Received:</strong> {documentCount}<br />
                <strong>Next Step:</strong> Return preparation in progress
              </Text>
            </Section>

            <Text style={paragraph}>
              You can check the status of your return anytime by visiting your dashboard:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Link
                style={button}
                href={dashboardUrl}
              >
                View Dashboard
              </Link>
            </Section>

            <Hr style={hr} />

            {/* Footer */}
            <Text style={footer}>
              <strong>Questions?</strong> Reply to this email to reach {preparerName} directly
              at <Link href={`mailto:${preparerEmail}`} style={link}>{preparerEmail}</Link>
            </Text>

            <Text style={footer}>
              This email was sent from Tax Genius Pro on behalf of {preparerName}, your assigned tax preparer.
            </Text>

            <Text style={smallText}>
              © {new Date().getFullYear()} Tax Genius Pro. All rights reserved.<br />
              You&apos;re receiving this email because you submitted tax documents through our platform.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default DocumentsReceivedEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const logoSection = {
  padding: '32px 48px',
  backgroundColor: '#ff6b35',
  textAlign: 'center' as const,
}

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0',
}

const content = {
  padding: '0 48px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
}

const infoBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const infoText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const buttonContainer = {
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
  padding: '14px 40px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '12px',
}

const link = {
  color: '#ff6b35',
  textDecoration: 'underline',
}

const smallText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '24px',
}
