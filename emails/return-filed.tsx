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

interface ReturnFiledEmailProps {
  clientName: string
  preparerName: string
  preparerEmail: string
  taxYear: number
  refundAmount?: number
  oweAmount?: number
  filedDate: string
  dashboardUrl?: string
}

export const ReturnFiledEmail = ({
  clientName = 'John Doe',
  preparerName = 'Sarah Johnson',
  preparerEmail = 'sarah@taxgeniuspro.tax',
  taxYear = 2024,
  refundAmount,
  oweAmount,
  filedDate = new Date().toLocaleDateString(),
  dashboardUrl = 'https://taxgeniuspro.tax/dashboard/client',
}: ReturnFiledEmailProps) => {
  const hasRefund = refundAmount && refundAmount > 0
  const owes = oweAmount && oweAmount > 0

  return (
    <Html>
      <Head />
      <Preview>
        Your {taxYear} tax return has been filed! - {preparerName} from Tax Genius Pro
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Heading style={heading}>Tax Genius Pro</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>🎉 Your Return Has Been Filed!</Heading>

            <Text style={paragraph}>
              Hi {clientName},
            </Text>

            <Text style={paragraph}>
              Excellent news! {preparerName} from Tax Genius Pro has successfully filed
              your {taxYear} tax return with the IRS.
            </Text>

            {/* Results Box */}
            <Section style={hasRefund ? successBox : (owes ? warningBox : infoBox)}>
              {hasRefund && (
                <>
                  <Heading style={boxHeading}>Expected Refund</Heading>
                  <Text style={bigNumber}>${refundAmount.toLocaleString()}</Text>
                  <Text style={boxText}>
                    You should receive your refund within 21 days via direct deposit or mail.
                  </Text>
                </>
              )}

              {owes && (
                <>
                  <Heading style={boxHeading}>Amount Owed</Heading>
                  <Text style={bigNumber}>${oweAmount.toLocaleString()}</Text>
                  <Text style={boxText}>
                    Payment is due by April 15th. See your dashboard for payment options.
                  </Text>
                </>
              )}

              {!hasRefund && !owes && (
                <>
                  <Heading style={boxHeading}>Return Status</Heading>
                  <Text style={boxText}>
                    Your tax return has been successfully filed. You&apos;ll receive an update once the IRS processes your return.
                  </Text>
                </>
              )}
            </Section>

            {/* Filing Details */}
            <Section style={detailsBox}>
              <Text style={detailsText}>
                <strong>Filed By:</strong> {preparerName}<br />
                <strong>Filing Date:</strong> {filedDate}<br />
                <strong>Tax Year:</strong> {taxYear}<br />
                <strong>Status:</strong> Submitted to IRS
              </Text>
            </Section>

            <Text style={paragraph}>
              You can view your complete tax return and track its status in your dashboard:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Link
                style={button}
                href={dashboardUrl}
              >
                View Tax Return
              </Link>
            </Section>

            <Hr style={hr} />

            {/* What&apos;s Next */}
            <Heading style={h2}>What&apos;s Next?</Heading>

            <Text style={listItem}>
              ✓ Your return is now with the IRS for processing
            </Text>
            <Text style={listItem}>
              ✓ You&apos;ll receive confirmation once the IRS accepts your return
            </Text>
            {hasRefund && (
              <Text style={listItem}>
                ✓ Expect your refund within 21 days of IRS acceptance
              </Text>
            )}
            {owes && (
              <Text style={listItem}>
                ✓ Make payment by April 15th to avoid penalties
              </Text>
            )}

            <Hr style={hr} />

            {/* Footer */}
            <Text style={footer}>
              <strong>Questions about your return?</strong> Reply to this email to reach {preparerName}
              directly at <Link href={`mailto:${preparerEmail}`} style={link}>{preparerEmail}</Link>
            </Text>

            <Text style={footer}>
              This email was sent from Tax Genius Pro on behalf of {preparerName}, your assigned tax preparer.
            </Text>

            <Text style={smallText}>
              © {new Date().getFullYear()} Tax Genius Pro. All rights reserved.<br />
              You&apos;re receiving this email because your tax return was filed through our platform.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ReturnFiledEmail

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

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
}

const successBox = {
  backgroundColor: '#d4edda',
  borderLeft: '4px solid #28a745',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const warningBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const infoBox = {
  backgroundColor: '#f6f9fc',
  borderLeft: '4px solid #6366f1',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const boxHeading = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const bigNumber = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#333',
  margin: '8px 0',
}

const boxText = {
  fontSize: '14px',
  color: '#525f7f',
  margin: '8px 0 0 0',
}

const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailsText = {
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

const listItem = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '8px',
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
