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
  Img,
} from '@react-email/components';
import * as React from 'react';

interface ReferralImage {
  url: string;
  alt: string;
}

interface ReferralInvitationEmailProps {
  clientName: string;
  preparerName: string;
  taxYear: number;
  refundAmount?: number;
  referralLink: string;
  referralCode: string;
  socialMediaCopy?: string;
  images?: ReferralImage[];
}

export const ReferralInvitationEmail = ({
  clientName = 'Friend',
  preparerName = 'Owliver',
  taxYear = 2024,
  refundAmount,
  referralLink = 'https://taxgeniuspro.tax/en/landing?ref=ow&r=1',
  referralCode = 'ow',
  socialMediaCopy,
  images = [],
}: ReferralInvitationEmailProps) => {
  // Social copy WITHOUT the link (they copy text, link is separate)
  const defaultSocialCopy = `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right?

They're offering $7,000 in tax advances and the process is super fast.

@taxgeniusig
#TaxGenius #TaxSeason2025 #GetYourRefund #MoneyMoves`;

  const socialCopy = socialMediaCopy || defaultSocialCopy;

  // Build share URLs for one-click sharing
  const shareText = `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right? They're offering $7,000 in tax advances!`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(referralLink);

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const smsShareUrl = `sms:?body=${encodeURIComponent(`${shareText} ${referralLink}`)}`;

  return (
    <Html>
      <Head />
      <Preview>
        While you wait on your refund, let Tax Genius help you make some money! Earn up to $1,125!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo Section */}
          <Section style={logoSection}>
            <Img
              src="https://taxgeniuspro.tax/images/tax-genius-logo.png"
              alt="Tax Genius Pro"
              style={logo}
            />
          </Section>

          {/* Hero Header - Big & Bold */}
          <Section style={heroHeader}>
            <Text style={preseasonBadge}>
              PRESEASON 2025
            </Text>
            <Heading style={heroHeadline}>
              Your {taxYear} Return is Complete!
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hey {clientName}!</Text>

            <Text style={bigMessage}>
              Now while you&apos;re waiting on your money...
            </Text>

            <Heading style={earnHeadline}>
              Let Tax Genius help you <span style={greenText}>MAKE</span> some money!
            </Heading>

            <Hr style={hr} />

            {/* Tiered Rewards - More Exciting */}
            <Section style={rewardsSection}>
              <Heading style={sectionTitle}>Start Earning Today!</Heading>

              <Text style={rewardsIntro}>
                Share Tax Genius with your friends and family and get PAID:
              </Text>

              <Section style={tierContainer}>
                <table style={tierTable} cellPadding="0" cellSpacing="0">
                  <tr>
                    <td style={tierCell}>
                      <div style={tierBox}>
                        <Text style={tierAmount}>$50</Text>
                        <Text style={tierLabel}>per person</Text>
                        <Text style={tierDescription}>First 5 referrals</Text>
                      </div>
                    </td>
                    <td style={tierCell}>
                      <div style={tierBox}>
                        <Text style={tierAmount}>$75</Text>
                        <Text style={tierLabel}>per person</Text>
                        <Text style={tierDescription}>6-10 referrals</Text>
                      </div>
                    </td>
                    <td style={tierCell}>
                      <div style={tierBoxHighlight}>
                        <Text style={tierAmountWhite}>$100</Text>
                        <Text style={tierLabelWhite}>per person</Text>
                        <Text style={tierDescriptionWhite}>After 10 referrals</Text>
                      </div>
                    </td>
                  </tr>
                </table>
              </Section>

              <Section style={earningsHighlight}>
                <Text style={earningsEmoji}>How do you like those apples?</Text>
                <Text style={earningsBig}>
                  Get <strong>$1,125</strong> for just 10 referrals!
                </Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Your Link - Super Simple */}
            <Section style={linkSection}>
              <Heading style={sectionTitle}>Your Personal Referral Link</Heading>

              <Text style={linkInstructions}>
                All you have to do is <strong>copy this link</strong> and share it on social media or send it to a friend!
              </Text>

              <Section style={linkBoxBig}>
                <Link href={referralLink} style={linkDisplayBig}>
                  {referralLink}
                </Link>
              </Section>

              <Section style={buttonContainer}>
                <Link style={bigButton} href={referralLink}>
                  SHARE THIS LINK
                </Link>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Social Media Copy - Easy to Use */}
            <Section style={socialSection}>
              <Heading style={sectionTitle}>Your Ready-Made Post</Heading>

              <Text style={socialInstructions}>
                Copy this caption for your social media post:
              </Text>

              {/* Caption to Copy */}
              <Section style={socialCopyBoxNew}>
                <Text style={socialCopyTextNew}>{socialCopy}</Text>
              </Section>

              {/* Separate Link Box */}
              <Text style={linkLabel}>Your Link (copy this too):</Text>
              <Section style={separateLinkBox}>
                <Link href={referralLink} style={separateLinkText}>
                  {referralLink}
                </Link>
              </Section>

              {/* One-Click Share Buttons */}
              <Text style={shareButtonsLabel}>Or share with one tap:</Text>
              <table style={shareButtonsTable} cellPadding="0" cellSpacing="0">
                <tr>
                  <td style={shareButtonCell}>
                    <Link href={facebookShareUrl} style={facebookButton}>
                      📘 Facebook
                    </Link>
                  </td>
                  <td style={shareButtonCell}>
                    <Link href={twitterShareUrl} style={twitterButton}>
                      🐦 X / Twitter
                    </Link>
                  </td>
                  <td style={shareButtonCell}>
                    <Link href={smsShareUrl} style={smsButton}>
                      💬 Text
                    </Link>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Marketing Images */}
            {images && images.length > 0 && (
              <>
                <Hr style={hr} />

                <Section style={imagesSection}>
                  <Heading style={sectionTitle}>Your Marketing Images</Heading>

                  <Text style={paragraph}>
                    Download and share these with your post:
                  </Text>

                  <Section style={imageGrid}>
                    {images.map((image, index) => (
                      <Link key={index} href={image.url} style={imageLink}>
                        <Img
                          src={image.url}
                          alt={image.alt}
                          style={imageThumb}
                        />
                      </Link>
                    ))}
                  </Section>
                </Section>
              </>
            )}

            <Hr style={hr} />

            {/* Final CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaText}>
                The more you share, the more you earn!
              </Text>
              <Section style={buttonContainer}>
                <Link style={bigButton} href={referralLink}>
                  START SHARING NOW
                </Link>
              </Section>
            </Section>

            {/* Signature */}
            <Section style={signatureSection}>
              <Text style={signatureText}>
                Thanks for being a Tax Genius client!
              </Text>
              <Text style={signatureName}>
                {preparerName}
              </Text>
              <Text style={signatureCompany}>
                Tax Genius Pro
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Questions? Call us at{' '}
              <Link href="tel:+14046271015" style={footerLink}>+1 404-627-1015</Link>
            </Text>
            <Text style={copyright}>
              © 2025 TaxGeniusPro. All rights reserved.
            </Text>
            <Text style={address}>
              1632 Jonesboro Rd SE, Atlanta, GA 30315
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ReferralInvitationEmail;

// Styles - Brand Colors
const brandGreen = '#22c55e';
const brandGreenDark = '#16a34a';
const brandYellow = '#f9d938';

const main = {
  backgroundColor: '#f4f4f4',
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

// Hero Header Styles
const heroHeader = {
  backgroundColor: '#111827',
  padding: '40px 30px',
  textAlign: 'center' as const,
};

const preseasonBadge = {
  display: 'inline-block',
  backgroundColor: brandGreen,
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  padding: '8px 16px',
  borderRadius: '20px',
  margin: '0 0 20px 0',
  letterSpacing: '1px',
};

const heroHeadline = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: '900',
  margin: '0 0 10px 0',
  lineHeight: '1.2',
};

const refundText = {
  color: '#9ca3af',
  fontSize: '18px',
  margin: '10px 0 0 0',
};

const refundAmountStyle = {
  color: brandGreen,
  fontWeight: 'bold',
  fontSize: '24px',
};

const content = {
  padding: '30px',
};

const greeting = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '10px',
};

const bigMessage = {
  color: '#6b7280',
  fontSize: '20px',
  margin: '0 0 20px 0',
};

const earnHeadline = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: '900',
  margin: '0 0 20px 0',
  lineHeight: '1.3',
};

const greenText = {
  color: brandGreen,
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const sectionTitle = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: '900',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '30px 0',
};

// Tiered Rewards Styles
const rewardsSection = {
  textAlign: 'center' as const,
};

const rewardsIntro = {
  color: '#4b5563',
  fontSize: '18px',
  marginBottom: '24px',
};

const tierContainer = {
  margin: '0 auto',
};

const tierTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tierCell = {
  width: '33.33%',
  padding: '0 5px',
  verticalAlign: 'top' as const,
};

const tierBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '16px',
  border: `3px solid ${brandGreen}`,
  padding: '20px 10px',
  textAlign: 'center' as const,
};

const tierBoxHighlight = {
  backgroundColor: brandGreen,
  borderRadius: '16px',
  border: `3px solid ${brandGreen}`,
  padding: '20px 10px',
  textAlign: 'center' as const,
};

const tierAmount = {
  color: brandGreen,
  fontSize: '36px',
  fontWeight: '900',
  margin: '0',
  lineHeight: '1',
};

const tierAmountWhite = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: '900',
  margin: '0',
  lineHeight: '1',
};

const tierLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '8px 0',
};

const tierLabelWhite = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px',
  margin: '8px 0',
};

const tierDescription = {
  color: '#111827',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '0',
};

const tierDescriptionWhite = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '0',
};

const earningsHighlight = {
  backgroundColor: brandYellow,
  padding: '24px',
  borderRadius: '16px',
  margin: '25px 0 0 0',
  textAlign: 'center' as const,
};

const earningsEmoji = {
  color: '#111827',
  fontSize: '20px',
  margin: '0 0 10px 0',
};

const earningsBig = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: '900',
  margin: '0',
};

// Link Section Styles
const linkSection = {
  textAlign: 'center' as const,
};

const linkInstructions = {
  color: '#4b5563',
  fontSize: '18px',
  marginBottom: '20px',
};

const linkBoxBig = {
  backgroundColor: '#f3f4f6',
  padding: '20px',
  borderRadius: '12px',
  margin: '20px 0',
  border: '2px dashed #d1d5db',
  wordBreak: 'break-all' as const,
};

const linkDisplayBig = {
  color: brandGreen,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  fontFamily: 'monospace',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const bigButton = {
  backgroundColor: brandGreen,
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '900',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '18px 40px',
  letterSpacing: '0.5px',
};

// Social Media Styles
const socialSection = {
  textAlign: 'center' as const,
};

const socialInstructions = {
  color: '#4b5563',
  fontSize: '16px',
  marginBottom: '20px',
};

const socialCopyBoxNew = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  margin: '16px 0',
  textAlign: 'left' as const,
};

const socialCopyTextNew = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const linkLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '20px 0 8px 0',
  textAlign: 'center' as const,
};

const separateLinkBox = {
  backgroundColor: '#ecfdf5',
  padding: '16px 20px',
  borderRadius: '12px',
  border: `2px solid ${brandGreen}`,
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
};

const separateLinkText = {
  color: brandGreen,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
};

const shareButtonsLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const shareButtonsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 auto',
};

const shareButtonCell = {
  width: '33.33%',
  padding: '0 4px',
  textAlign: 'center' as const,
};

const facebookButton = {
  display: 'inline-block',
  backgroundColor: '#1877f2',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 8px',
  borderRadius: '8px',
  width: '100%',
};

const twitterButton = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 8px',
  borderRadius: '8px',
  width: '100%',
};

const smsButton = {
  display: 'inline-block',
  backgroundColor: brandGreen,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 8px',
  borderRadius: '8px',
  width: '100%',
};

// Keep old styles for backwards compatibility
const socialCopyBox = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderRadius: '12px',
  border: `3px solid ${brandGreen}`,
  margin: '20px 0',
  textAlign: 'left' as const,
};

const socialCopyLabel = {
  color: brandGreen,
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '12px',
};

const socialCopyText = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '24px',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
};

// Images Section Styles
const imagesSection = {
  textAlign: 'center' as const,
};

const imageGrid = {
  margin: '20px 0',
};

const imageLink = {
  display: 'inline-block' as const,
  margin: '5px',
};

const imageThumb = {
  width: '120px',
  height: '120px',
  objectFit: 'cover' as const,
  borderRadius: '12px',
  border: '2px solid #e5e7eb',
};

// Final CTA Styles
const finalCta = {
  backgroundColor: brandYellow,
  borderRadius: '16px',
  padding: '30px',
  textAlign: 'center' as const,
};

const finalCtaText = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '900',
  margin: '0 0 20px 0',
};

// Signature Styles
const signatureSection = {
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center' as const,
};

const signatureText = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0 0 10px 0',
};

const signatureName = {
  color: brandGreen,
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 3px 0',
};

const signatureCompany = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

// Footer Styles
const footerSection = {
  backgroundColor: '#111827',
  padding: '25px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '0 0 10px 0',
};

const footerLink = {
  color: brandYellow,
  textDecoration: 'none',
};

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '10px 0 5px 0',
};

const address = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
};
