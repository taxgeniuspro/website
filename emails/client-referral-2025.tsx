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
  Button,
} from '@react-email/components';
import * as React from 'react';

interface ReferralImage {
  url: string;
  alt: string;
  title: string;
}

interface ClientReferral2025Props {
  clientName: string;
  clientFirstName: string;
  referralLink: string;
  referralCode: string;
  qrCodeImageUrl?: string;
  dashboardUrl?: string;
  images?: ReferralImage[];
  preparerName?: string;
  preparerAvatarUrl?: string;
}

export const ClientReferral2025 = ({
  clientName = 'Valued Client',
  clientFirstName = 'Friend',
  referralLink = 'https://taxgeniuspro.tax/go/xx-intake',
  referralCode = 'xx',
  qrCodeImageUrl,
  dashboardUrl = 'https://taxgeniuspro.tax/dashboard/client',
  images = [],
  preparerName = 'Tax Genius Pro',
  preparerAvatarUrl,
}: ClientReferral2025Props) => {
  // Default marketing images - empty until actual images are uploaded
  const defaultImages: ReferralImage[] = [];

  const allImages = images.length > 0 ? images : defaultImages;

  const socialMediaCopy = `I just got my taxes done with Tax Genius Pro and it was SO easy!

They're offering $7,000 in tax advances and the process is super fast.

Use my personal link to get started: ${referralLink}

#TaxGenius #TaxSeason2025 #GetYourRefund #MoneyMoves`;

  return (
    <Html>
      <Head />
      <Preview>
        Earn $50 for every friend you refer to Tax Genius Pro!
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
            <Text style={headerEmoji}>💰</Text>
            <Heading style={h1}>Earn $50 Per Referral!</Heading>
            <Text style={headerSubtext}>Share your link. Get paid when friends file.</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {clientFirstName}!</Text>

            <Text style={paragraph}>
              Thank you for choosing Tax Genius Pro for your taxes! We'd love for you to share your
              experience with friends and family - and we'll pay you <strong>$50 for every person
              who files their taxes using your link</strong>!
            </Text>

            <Hr style={hr} />

            {/* How It Works */}
            <Section style={howItWorksSection}>
              <Heading style={h2}>📋 How It Works</Heading>

              <Section style={stepsGrid}>
                <Section style={stepCard}>
                  <Text style={stepNumber}>1</Text>
                  <Text style={stepIcon}>📤</Text>
                  <Text style={stepTitle}>Share Your Link</Text>
                  <Text style={stepText}>Send your personal link to friends, family, or post it on social media</Text>
                </Section>

                <Section style={stepCard}>
                  <Text style={stepNumber}>2</Text>
                  <Text style={stepIcon}>📝</Text>
                  <Text style={stepTitle}>They File Taxes</Text>
                  <Text style={stepText}>When they complete their tax filing through your link</Text>
                </Section>

                <Section style={stepCard}>
                  <Text style={stepNumber}>3</Text>
                  <Text style={stepIcon}>💰</Text>
                  <Text style={stepTitle}>You Get Paid!</Text>
                  <Text style={stepText}>Receive $50 for each successful referral</Text>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Your Personal Link */}
            <Section style={linkSection}>
              <Heading style={h2}>🔗 Your Personal Referral Link</Heading>

              <Section style={linkBox}>
                <Link href={referralLink} style={linkDisplay}>
                  {referralLink}
                </Link>
              </Section>

              <Section style={buttonContainer}>
                <Button style={primaryButton} href={referralLink}>
                  Open My Referral Link
                </Button>
              </Section>

              <Text style={linkNote}>
                Referral Code: <strong>{referralCode}</strong>
              </Text>
            </Section>

            {/* QR Code if available */}
            {qrCodeImageUrl && (
              <>
                <Hr style={hr} />
                <Section style={qrSection}>
                  <Heading style={h2}>📱 Your QR Code</Heading>
                  <Text style={paragraph}>
                    Show this QR code to friends - they can scan it with their phone camera!
                  </Text>
                  <Section style={qrCodeContainer}>
                    <Img
                      src={qrCodeImageUrl}
                      alt="Your Referral QR Code"
                      style={qrCode}
                    />
                  </Section>
                </Section>
              </>
            )}

            <Hr style={hr} />

            {/* Social Media Sharing */}
            <Section style={socialSection}>
              <Heading style={h2}>📲 Share on Social Media</Heading>
              <Text style={paragraph}>
                Ready-to-post content - just copy and paste!
              </Text>

              <Section style={socialCopyBox}>
                <Text style={socialCopyLabel}>COPY THIS TEXT:</Text>
                <Text style={socialCopyText}>{socialMediaCopy}</Text>
              </Section>

              {/* Marketing Images - only show if images are provided */}
              {allImages.length > 0 && (
                <>
                  <Text style={imageGridTitle}>📸 Download & Share These Images:</Text>
                  <Section style={imageGrid}>
                    {allImages.map((image, index) => (
                      <Section key={index} style={imageItem}>
                        <Link href={image.url}>
                          <Img
                            src={image.url}
                            alt={image.alt}
                            style={imageThumb}
                          />
                        </Link>
                        <Text style={imageCaption}>{image.title}</Text>
                      </Section>
                    ))}
                  </Section>
                  <Text style={imageNote}>
                    Click images to download full size
                  </Text>
                </>
              )}

              {/* Quick Share Buttons */}
              <Section style={socialButtonsContainer}>
                <Text style={socialButtonsLabel}>Quick Share:</Text>
                <Section style={socialButtons}>
                  <Link
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent('Get your taxes done fast and I get $50! Win-win!')}`}
                    style={facebookButton}
                  >
                    📘 Facebook
                  </Link>
                  <Link
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Need your taxes done? Use my link and get hooked up! ${referralLink} #TaxGenius #TaxSeason2025`)}`}
                    style={twitterButton}
                  >
                    🐦 Twitter/X
                  </Link>
                  <Link
                    href={`https://wa.me/?text=${encodeURIComponent(`Hey! I just got my taxes done with Tax Genius Pro. They're offering up to $7,000 in advances! Use my link: ${referralLink}`)}`}
                    style={whatsappButton}
                  >
                    💬 WhatsApp
                  </Link>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Benefits Section */}
            <Section style={benefitsSection}>
              <Heading style={h2}>✅ Why Share?</Heading>
              <Section style={benefitsList}>
                <Section style={benefitItem}>
                  <Text style={benefitIcon}>💵</Text>
                  <Text style={benefitText}><strong>$50 per referral</strong> - no limit on earnings!</Text>
                </Section>
                <Section style={benefitItem}>
                  <Text style={benefitIcon}>📊</Text>
                  <Text style={benefitText}><strong>Track your referrals</strong> in your dashboard</Text>
                </Section>
                <Section style={benefitItem}>
                  <Text style={benefitIcon}>⚡</Text>
                  <Text style={benefitText}><strong>Get paid fast</strong> when returns are filed</Text>
                </Section>
                <Section style={benefitItem}>
                  <Text style={benefitIcon}>🎁</Text>
                  <Text style={benefitText}><strong>Help friends & family</strong> get great tax service</Text>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Dashboard CTA */}
            <Section style={dashboardSection}>
              <Text style={dashboardText}>
                Track your referrals and earnings in your dashboard:
              </Text>
              <Section style={buttonContainer}>
                <Button style={secondaryButton} href={dashboardUrl}>
                  Go to My Dashboard
                </Button>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Final CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaEmoji}>🚀</Text>
              <Text style={finalCtaText}>Start Sharing Today!</Text>
              <Text style={finalCtaSubtext}>
                The more you share, the more you earn!
              </Text>
              <Section style={buttonContainer}>
                <Button style={ctaButton} href={referralLink}>
                  Share My Link Now
                </Button>
              </Section>
            </Section>

            {/* Signature */}
            <Section style={signatureSection}>
              <Text style={signatureGreeting}>Happy referring!</Text>
              <Img
                src="https://res.cloudinary.com/dhktmiigh/image/upload/v1765487887/taxgeniuspro/preparers/preparer_iw.jpg"
                alt="Ira Watkins"
                style={signatureAvatar}
              />
              <Text style={signatureName}>Ira Watkins</Text>
              <Text style={signatureTitle}>Founder, Tax Genius Pro</Text>
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
            <Text style={unsubscribe}>
              <Link href="https://taxgeniuspro.tax/unsubscribe" style={unsubscribeLink}>
                Unsubscribe from referral emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ClientReferral2025;

// Styles - Brand Colors (matching cash-advance page)
const brandGreen = '#408851';
const brandGreenLight = '#4ade80';
const brandYellow = '#f9d938';
const brandGradient = 'linear-gradient(135deg, #408851 0%, #4ade80 100%)';

const main = {
  backgroundColor: '#f2f7ff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '25px 20px',
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

const headerEmoji = {
  fontSize: '48px',
  margin: '0 0 15px 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const headerSubtext = {
  color: '#ffffff',
  fontSize: '18px',
  margin: '0',
  opacity: '0.95',
};

const content = {
  padding: '30px',
};

const greeting = {
  color: brandGreen,
  fontSize: '22px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const h2 = {
  color: brandGreen,
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

// How It Works Section
const howItWorksSection = {
  textAlign: 'center' as const,
};

const stepsGrid = {
  margin: '25px 0',
};

const stepCard = {
  display: 'inline-block' as const,
  width: '30%',
  padding: '20px 10px',
  margin: '0 5px',
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
};

const stepNumber = {
  backgroundColor: brandGreen,
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  width: '32px',
  height: '32px',
  lineHeight: '32px',
  borderRadius: '50%',
  margin: '0 auto 10px auto',
  display: 'block',
};

const stepIcon = {
  fontSize: '36px',
  margin: '0 0 10px 0',
};

const stepTitle = {
  color: brandGreen,
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const stepText = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0',
};

// Link Section
const linkSection = {
  textAlign: 'center' as const,
};

const linkBox = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '12px',
  margin: '20px 0',
  border: `2px dashed ${brandGreen}`,
  wordBreak: 'break-all' as const,
};

const linkDisplay = {
  color: brandGreen,
  fontSize: '16px',
  textDecoration: 'none',
  fontFamily: 'monospace',
  fontWeight: 'bold' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const primaryButton = {
  backgroundColor: brandGreen,
  borderRadius: '50px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 40px',
  boxShadow: '0 4px 14px rgba(64, 136, 81, 0.4)',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  borderRadius: '50px',
  color: brandGreen,
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 35px',
  border: `2px solid ${brandGreen}`,
};

const ctaButton = {
  backgroundColor: brandYellow,
  borderRadius: '50px',
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '18px 50px',
  boxShadow: '0 4px 14px rgba(249, 217, 56, 0.4)',
};

const linkNote = {
  color: '#666',
  fontSize: '14px',
  margin: '15px 0 0 0',
};

// QR Code Section
const qrSection = {
  textAlign: 'center' as const,
};

const qrCodeContainer = {
  margin: '20px 0',
  textAlign: 'center' as const,
};

const qrCode = {
  width: '180px',
  height: '180px',
  margin: '0 auto',
  borderRadius: '12px',
  border: `4px solid ${brandGreen}`,
};

// Social Section
const socialSection = {
  textAlign: 'center' as const,
};

const socialCopyBox = {
  backgroundColor: '#f9f9f9',
  padding: '20px',
  borderRadius: '12px',
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

const imageGridTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '25px 0 15px 0',
};

const imageGrid = {
  textAlign: 'center' as const,
};

const imageItem = {
  display: 'inline-block' as const,
  margin: '10px',
  textAlign: 'center' as const,
};

const imageThumb = {
  width: '140px',
  height: '140px',
  objectFit: 'cover' as const,
  borderRadius: '12px',
  border: '2px solid #e0e0e0',
};

const imageCaption = {
  color: '#666',
  fontSize: '12px',
  margin: '8px 0 0 0',
};

const imageNote = {
  color: '#999',
  fontSize: '12px',
  margin: '15px 0 0 0',
};

const socialButtonsContainer = {
  marginTop: '25px',
  textAlign: 'center' as const,
};

const socialButtonsLabel = {
  color: '#666',
  fontSize: '14px',
  marginBottom: '15px',
};

const socialButtons = {
  textAlign: 'center' as const,
};

const facebookButton = {
  backgroundColor: '#1877F2',
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '10px 18px',
  margin: '5px',
  display: 'inline-block',
};

const twitterButton = {
  backgroundColor: '#1DA1F2',
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '10px 18px',
  margin: '5px',
  display: 'inline-block',
};

const whatsappButton = {
  backgroundColor: '#25D366',
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '10px 18px',
  margin: '5px',
  display: 'inline-block',
};

// Benefits Section
const benefitsSection = {
  backgroundColor: '#f0fdf4',
  borderRadius: '16px',
  padding: '25px',
};

const benefitsList = {
  margin: '0',
};

const benefitItem = {
  marginBottom: '15px',
};

const benefitIcon = {
  fontSize: '24px',
  display: 'inline',
  marginRight: '12px',
  verticalAlign: 'middle',
};

const benefitText = {
  color: '#333',
  fontSize: '15px',
  display: 'inline',
  verticalAlign: 'middle',
};

// Dashboard Section
const dashboardSection = {
  textAlign: 'center' as const,
};

const dashboardText = {
  color: '#666',
  fontSize: '16px',
  marginBottom: '15px',
};

// Final CTA
const finalCta = {
  backgroundColor: brandYellow,
  borderRadius: '16px',
  padding: '35px',
  textAlign: 'center' as const,
};

const finalCtaEmoji = {
  fontSize: '48px',
  margin: '0 0 15px 0',
};

const finalCtaText = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const finalCtaSubtext = {
  color: '#555',
  fontSize: '16px',
  margin: '0 0 20px 0',
};

// Signature Section
const signatureSection = {
  marginTop: '30px',
  paddingTop: '25px',
  borderTop: '1px solid #eee',
  textAlign: 'center' as const,
};

const signatureGreeting = {
  color: '#666',
  fontSize: '16px',
  fontStyle: 'italic' as const,
  margin: '0 0 20px 0',
};

const signatureAvatar = {
  width: '70px',
  height: '70px',
  borderRadius: '50%',
  margin: '0 auto 10px auto',
  border: `3px solid ${brandGreen}`,
};

const signatureName = {
  color: brandGreen,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 3px 0',
};

const signatureTitle = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

// Footer
const footerSection = {
  backgroundColor: '#333',
  padding: '30px',
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
  margin: '0 0 15px 0',
};

const unsubscribe = {
  margin: '0',
};

const unsubscribeLink = {
  color: '#666',
  fontSize: '11px',
  textDecoration: 'underline',
};
