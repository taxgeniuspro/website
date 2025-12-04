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

interface ReferralInvitationEmailProps {
  clientName: string
  preparerName: string
  taxYear: number
  refundAmount?: number
  signupUrl?: string
}

export const ReferralInvitationEmail = ({
  clientName = 'John Doe',
  preparerName = 'Sarah Johnson',
  taxYear = 2024,
  refundAmount,
  signupUrl = 'https://taxgeniuspro.tax/auth/signup?role=referrer',
}: ReferralInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Earn up to $50 per referral + qualify for FREE trips! - Tax Genius Pro
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Heading style={heading}>Tax Genius Pro</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>🎉 Your {taxYear} Return is Complete!</Heading>

            <Text style={paragraph}>
              Hi {clientName},
            </Text>

            <Text style={paragraph}>
              Congratulations! {preparerName} has successfully filed your tax return.
              {refundAmount && refundAmount > 0 && (
                <> Your estimated refund of <strong>${refundAmount.toLocaleString()}</strong> should
                arrive within 21 days.</>
              )}
            </Text>

            <Hr style={hr} />

            {/* Invitation Section */}
            <Section style={invitationBox}>
              <Heading style={invitationHeading}>
                💰 Want to Earn Extra Cash?
              </Heading>

              <Text style={invitationText}>
                Since you had such a great experience with Tax Genius Pro, we&apos;d like to invite
                you to join our <strong>Referral Rewards Program</strong>!
              </Text>
            </Section>

            {/* Benefits Grid */}
            <Section style={benefitsSection}>
              <Heading style={h2}>Here&apos;s What You Can Earn:</Heading>

              <Section style={benefitBox}>
                <Text style={benefitEmoji}>💵</Text>
                <Text style={benefitTitle}>Cash Rewards</Text>
                <Text style={benefitText}>
                  Earn <strong>$50 for each friend</strong> who completes their tax return with us
                </Text>
              </Section>

              <Section style={benefitBox}>
                <Text style={benefitEmoji}>✈️</Text>
                <Text style={benefitTitle}>Free Trips</Text>
                <Text style={benefitText}>
                  Qualify for all-expenses-paid trips to amazing destinations when you refer multiple people
                </Text>
              </Section>

              <Section style={benefitBox}>
                <Text style={benefitEmoji}>🏆</Text>
                <Text style={benefitTitle}>Monthly Contests</Text>
                <Text style={benefitText}>
                  Compete for bonus prizes and recognition as a top referrer
                </Text>
              </Section>

              <Section style={benefitBox}>
                <Text style={benefitEmoji}>🔗</Text>
                <Text style={benefitTitle}>Custom Link</Text>
                <Text style={benefitText}>
                  Get your own personalized referral link like TaxGeniusPro.tax/YourName
                </Text>
              </Section>
            </Section>

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Text style={ctaText}>
                It&apos;s completely free to join and takes less than 2 minutes to set up!
              </Text>

              <Section style={buttonContainer}>
                <Link
                  style={button}
                  href={signupUrl}
                >
                  Start Earning Today
                </Link>
              </Section>

              <Text style={subText}>
                No experience needed • Free marketing materials • 24/7 support
              </Text>
            </Section>

            <Hr style={hr} />

            {/* How It Works */}
            <Heading style={h2}>How It Works:</Heading>

            <Text style={stepText}>
              <strong>1.</strong> Sign up for free and get your unique referral link
            </Text>
            <Text style={stepText}>
              <strong>2.</strong> Share your link with friends, family, or on social media
            </Text>
            <Text style={stepText}>
              <strong>3.</strong> Earn $50 every time someone files their taxes using your link
            </Text>
            <Text style={stepText}>
              <strong>4.</strong> Watch your earnings grow and qualify for amazing rewards!
            </Text>

            <Hr style={hr} />

            {/* Social Proof */}
            <Section style={socialProofBox}>
              <Text style={socialProofText}>
                &quot;I&apos;ve earned over $2,400 just by telling my friends about Tax Genius Pro!
                The referral program is incredibly easy and the rewards are real.&quot;
              </Text>
              <Text style={socialProofAuthor}>
                — Maria G., Top Referrer
              </Text>
            </Section>

            {/* Final CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaText}>
                Ready to turn your network into income?
              </Text>

              <Section style={buttonContainer}>
                <Link
                  style={button}
                  href={signupUrl}
                >
                  Join the Referral Program
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Text style={footer}>
              Questions? Visit our <Link href="https://taxgeniuspro.tax/refer" style={link}>Referral Program page</Link> or reply to this email.
            </Text>

            <Text style={smallText}>
              © {new Date().getFullYear()} Tax Genius Pro. All rights reserved.<br />
              You&apos;re receiving this email because you recently filed your taxes with us.
              This is a one-time invitation to our referral program.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ReferralInvitationEmail

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
  margin: '32px 0 16px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
}

const invitationBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const invitationHeading = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 12px 0',
}

const invitationText = {
  fontSize: '16px',
  color: '#525f7f',
  margin: '0',
  lineHeight: '24px',
}

const benefitsSection = {
  margin: '24px 0',
}

const benefitBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '12px 0',
  textAlign: 'center' as const,
}

const benefitEmoji = {
  fontSize: '32px',
  margin: '0 0 8px 0',
}

const benefitTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '8px 0',
}

const benefitText = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '20px',
  margin: '4px 0 0 0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaText = {
  fontSize: '18px',
  color: '#333',
  fontWeight: 'bold',
  marginBottom: '20px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 48px',
}

const subText = {
  fontSize: '14px',
  color: '#8898aa',
  marginTop: '12px',
}

const stepText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '28px',
  marginBottom: '8px',
}

const socialProofBox = {
  backgroundColor: '#f6f9fc',
  borderLeft: '4px solid #28a745',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  fontStyle: 'italic' as const,
}

const socialProofText = {
  fontSize: '16px',
  color: '#333',
  lineHeight: '24px',
  margin: '0 0 12px 0',
}

const socialProofAuthor = {
  fontSize: '14px',
  color: '#525f7f',
  fontStyle: 'normal' as const,
  fontWeight: 'bold',
}

const finalCta = {
  backgroundColor: '#d4edda',
  borderRadius: '8px',
  padding: '32px 24px',
  margin: '32px 0',
  textAlign: 'center' as const,
}

const finalCtaText = {
  fontSize: '20px',
  color: '#333',
  fontWeight: 'bold',
  marginBottom: '20px',
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
  textAlign: 'center' as const,
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
  textAlign: 'center' as const,
}
