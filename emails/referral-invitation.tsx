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
  referralLink = 'https://taxgeniuspro.tax/en/landing?ref=ow',
  referralCode = 'Abc123',
  socialMediaCopy,
  images = [],
}: ReferralInvitationEmailProps) => {
  const defaultSocialCopy = `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right?

They're offering $7,000 in tax advances and the process is super fast.

Use my personal link: ${referralLink}

@taxgeniusig
#TaxGenius #TaxSeason2025 #GetYourRefund #MoneyMoves`;

  const socialCopy = socialMediaCopy || defaultSocialCopy;

  return (
    <Html>
      <Head />
      <Preview>
        Earn up to $100 per referral - $1,125 for 10 referrals! - Tax Genius Pro
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

          {/* Header with Green Gradient */}
          <Section style={header}>
            <Heading style={h1}>🎉 Your {taxYear} Return is Complete!</Heading>
            <Text style={headerSubtext}>Thank you for trusting Tax Genius!</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Dear {clientName},</Text>

            <Text style={paragraph}>
              Thank you for trusting Tax Genius to make your tax season a breeze!
              {refundAmount && refundAmount > 0 && (
                <> Your estimated refund of <strong>${refundAmount.toLocaleString()}</strong> should
                arrive within 21 days.</>
              )}
            </Text>

            <Text style={paragraph}>
              Now that your taxes are expertly handled, we&apos;ve got some exciting news...
            </Text>

            <Hr style={hr} />

            {/* Tiered Rewards Section */}
            <Section style={rewardsSection}>
              <Heading style={h2}>💰 Start Earning Today!</Heading>

              <Text style={rewardsIntro}>
                You can start earning money by sharing Tax Genius with your friends and family:
              </Text>

              <Section style={tierContainer}>
                <Section style={tierBox}>
                  <Text style={tierAmount}>$50</Text>
                  <Text style={tierLabel}>per person</Text>
                  <Text style={tierDescription}>First 5 referrals</Text>
                </Section>

                <Section style={tierBox}>
                  <Text style={tierAmount}>$75</Text>
                  <Text style={tierLabel}>per person</Text>
                  <Text style={tierDescription}>6-10 referrals</Text>
                </Section>

                <Section style={tierBoxHighlight}>
                  <Text style={tierAmount}>$100</Text>
                  <Text style={tierLabel}>per person</Text>
                  <Text style={tierDescription}>After 10 referrals</Text>
                </Section>
              </Section>

              <Section style={earningsHighlight}>
                <Text style={earningsText}>
                  🍎 How do you like those apples?
                </Text>
                <Text style={earningsBig}>
                  Get <strong>$1,125</strong> for just 10 referrals!
                </Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Your Personal Link */}
            <Section style={linkSection}>
              <Heading style={h2}>🔗 Your Personal Referral Link</Heading>

              <Text style={paragraph}>
                Share your personalized referral link with friends, family, co-workers, or that old lady
                who still uses a calculator from the 70s!
              </Text>

              <Section style={linkBox}>
                <Link href={referralLink} style={linkDisplay}>
                  {referralLink}
                </Link>
              </Section>

              <Section style={buttonContainer}>
                <Link style={button} href={referralLink}>
                  Click Here - Customized to Make You Money 💸
                </Link>
              </Section>

              <Text style={linkNote}>
                Your referral code: <strong>{referralCode}</strong>
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Social Media Section */}
            <Section style={socialSection}>
              <Heading style={h2}>📱 Ready-to-Post Social Media Copy</Heading>

              <Text style={paragraph}>
                While you&apos;re waiting on that check, make some money posting this on your IG, Facebook,
                or send it as an SMS. We&apos;re making it easy for you!
              </Text>

              <Section style={socialCopyBox}>
                <Text style={socialCopyLabel}>COPY AND PASTE THIS TEXT:</Text>
                <Text style={socialCopyText}>{socialCopy}</Text>
              </Section>

              <Text style={socialTip}>
                💡 Pro tip: Add your referral link when you post!
              </Text>
            </Section>

            {/* Marketing Images Section */}
            {images && images.length > 0 && (
              <>
                <Hr style={hr} />

                <Section style={imagesSection}>
                  <Heading style={h2}>🖼️ Your Marketing Images</Heading>

                  <Text style={paragraph}>
                    Download these images and share them on social media along with your referral link:
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

                  <Text style={imageNote}>
                    Click on images to download • Optimized for Instagram & Facebook
                  </Text>
                </Section>
              </>
            )}

            <Hr style={hr} />

            {/* How It Works */}
            <Section style={howItWorksSection}>
              <Heading style={h2}>📋 How It Works</Heading>

              <Text style={stepText}>
                <strong>1.</strong> Share your personalized link above
              </Text>
              <Text style={stepText}>
                <strong>2.</strong> Post the social media copy with your images
              </Text>
              <Text style={stepText}>
                <strong>3.</strong> Earn cash when friends file their taxes!
              </Text>
              <Text style={stepText}>
                <strong>4.</strong> Track your earnings in your dashboard
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Final CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaText}>
                The more you share, the more you earn! 😉
              </Text>
              <Section style={buttonContainer}>
                <Link style={button} href={referralLink}>
                  Start Sharing Now
                </Link>
              </Section>
            </Section>

            {/* Signature */}
            <Section style={signatureSection}>
              <Text style={signatureText}>
                Warm regards,
              </Text>
              <Text style={signatureName}>
                {preparerName}
              </Text>
              <Text style={signatureCompany}>
                Tax Genius
              </Text>
              <Text style={signatureTagline}>
                Where your tax refund and side hustle both get a boost!
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
const brandGreen = '#408851';
const brandYellow = '#f9d938';
const brandGradient = 'linear-gradient(135deg, #408851 0%, #5ba568 100%)';

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

const header = {
  background: brandGradient,
  padding: '40px 30px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const headerSubtext = {
  color: '#ffffff',
  fontSize: '16px',
  margin: '0',
  opacity: '0.9',
};

const content = {
  padding: '30px',
};

const greeting = {
  color: brandGreen,
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const h2 = {
  color: brandGreen,
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

// Tiered Rewards Styles
const rewardsSection = {
  textAlign: 'center' as const,
};

const rewardsIntro = {
  color: '#333',
  fontSize: '16px',
  marginBottom: '24px',
};

const tierContainer = {
  margin: '0 auto',
};

const tierBox = {
  display: 'inline-block' as const,
  width: '30%',
  padding: '20px 10px',
  margin: '0 5px 15px 5px',
  backgroundColor: '#f0fdf4',
  borderRadius: '12px',
  border: `2px solid ${brandGreen}`,
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
};

const tierBoxHighlight = {
  ...tierBox,
  backgroundColor: brandGreen,
  border: `2px solid ${brandGreen}`,
};

const tierAmount = {
  color: brandGreen,
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const tierLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '5px 0',
};

const tierDescription = {
  color: '#333',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '0',
};

const earningsHighlight = {
  backgroundColor: brandYellow,
  padding: '20px',
  borderRadius: '12px',
  margin: '25px 0 0 0',
  textAlign: 'center' as const,
};

const earningsText = {
  color: '#333',
  fontSize: '18px',
  margin: '0 0 10px 0',
};

const earningsBig = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

// Link Section Styles
const linkSection = {
  textAlign: 'center' as const,
};

const linkBox = {
  backgroundColor: '#f5f5f5',
  padding: '15px',
  borderRadius: '8px',
  margin: '20px 0',
  border: '1px dashed #ccc',
  wordBreak: 'break-all' as const,
};

const linkDisplay = {
  color: brandGreen,
  fontSize: '14px',
  textDecoration: 'none',
  fontFamily: 'monospace',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: brandGreen,
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
};

const linkNote = {
  color: '#666',
  fontSize: '14px',
  marginTop: '10px',
};

// Social Media Styles
const socialSection = {
  textAlign: 'center' as const,
};

const socialCopyBox = {
  backgroundColor: '#f9f9f9',
  padding: '20px',
  borderRadius: '8px',
  border: `2px solid ${brandGreen}`,
  margin: '20px 0',
  textAlign: 'left' as const,
};

const socialCopyLabel = {
  color: brandGreen,
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '10px',
};

const socialCopyText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
};

const socialTip = {
  color: '#666',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  marginTop: '15px',
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
  borderRadius: '8px',
  border: '1px solid #ddd',
};

const imageNote = {
  color: '#666',
  fontSize: '12px',
  marginTop: '10px',
};

// How It Works Styles
const howItWorksSection = {
  backgroundColor: '#f0fdf4',
  padding: '25px',
  borderRadius: '12px',
};

const stepText = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '28px',
  marginBottom: '8px',
};

// Final CTA Styles
const finalCta = {
  backgroundColor: brandYellow,
  borderRadius: '12px',
  padding: '30px',
  textAlign: 'center' as const,
};

const finalCtaText = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

// Signature Styles
const signatureSection = {
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #eee',
};

const signatureText = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 5px 0',
};

const signatureName = {
  color: brandGreen,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 3px 0',
};

const signatureCompany = {
  color: '#333',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const signatureTagline = {
  color: '#666',
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: '0',
};

// Footer Styles
const footerSection = {
  backgroundColor: '#333',
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
  color: '#999',
  fontSize: '12px',
  margin: '10px 0 5px 0',
};

const address = {
  color: '#999',
  fontSize: '12px',
  margin: '0',
};
