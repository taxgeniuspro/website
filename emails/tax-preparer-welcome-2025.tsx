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
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface MarketingImage {
  url: string;
  alt: string;
  title: string;
}

interface TaxPreparerWelcome2025Props {
  firstName: string;
  lastName: string;
  email: string;
  trackingCode: string;
  avatarUrl?: string;
  qrCodeImageUrl?: string;
  dashboardUrl?: string;
  contactFormLink?: string;
  intakeFormLink?: string;
  appointmentLink?: string;
  marketingImages?: MarketingImage[];
  hasProfessionalEmail?: boolean;
  professionalEmail?: string;
}

export const TaxPreparerWelcome2025 = ({
  firstName = 'Tax Preparer',
  lastName = '',
  email = 'preparer@example.com',
  trackingCode = 'xx',
  avatarUrl,
  qrCodeImageUrl,
  dashboardUrl = 'https://taxgeniuspro.tax/auth/signin',
  contactFormLink = 'https://taxgeniuspro.tax/go/xx-lead',
  intakeFormLink = 'https://taxgeniuspro.tax/go/xx-intake',
  appointmentLink = 'https://taxgeniuspro.tax/go/xx-appt',
  marketingImages = [],
  hasProfessionalEmail = false,
  professionalEmail,
}: TaxPreparerWelcome2025Props) => {
  const fullName = `${firstName} ${lastName}`.trim();

  // Default marketing images if none provided - using actual images from the site
  const defaultImages: MarketingImage[] = [];

  const images = marketingImages.length > 0 ? marketingImages : defaultImages;

  const socialMediaCopy = `Need your taxes done FAST? I'm partnered with Tax Genius Pro and can get you up to $7,000 in tax advances!

Click my link to get started: ${intakeFormLink}

#TaxGenius #TaxSeason2025 #GetYourRefund #TaxPreparer`;

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to Tax Genius Pro, {firstName}! Your dashboard, QR code, and marketing links are ready.
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
            <Heading style={h1}>Welcome to Tax Season 2025!</Heading>
            <Text style={headerSubtext}>Your Tax Preparer Dashboard is Ready</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {/* Personal Greeting with Avatar */}
            <Section style={greetingSection}>
              {avatarUrl && (
                <Img
                  src={avatarUrl}
                  alt={fullName}
                  style={avatar}
                />
              )}
              <Heading style={h2}>Hi {firstName}!</Heading>
              <Text style={paragraph}>
                Your Tax Genius Pro dashboard is all set up and ready to go. This email contains
                everything you need to start bringing in clients and growing your tax preparation business.
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Dashboard Access Card */}
            <Section style={cardSection}>
              <Section style={card}>
                <Text style={cardIcon}>🖥️</Text>
                <Heading style={cardTitle}>Access Your Dashboard</Heading>
                <Text style={cardText}>
                  View your leads, manage clients, track earnings, and access all your marketing tools.
                </Text>
                <Section style={buttonContainer}>
                  <Button style={primaryButton} href={dashboardUrl}>
                    Login to Dashboard
                  </Button>
                </Section>
                <Text style={cardNote}>
                  Login with: <strong>{email}</strong>
                </Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Two Marketing Links - THE KEY SECTION */}
            <Section style={linksSection}>
              <Heading style={sectionTitle}>🔗 Your Personal Marketing Links</Heading>
              <Text style={sectionSubtitle}>
                You have TWO types of links to share with potential clients:
              </Text>

              {/* Link 1: Contact Form */}
              <Section style={linkCard}>
                <Section style={linkCardHeader}>
                  <Text style={linkCardIcon}>📞</Text>
                  <Text style={linkCardLabel}>LINK 1: CONTACT FORM</Text>
                </Section>
                <Text style={linkCardTitle}>
                  For people who want YOU to contact THEM
                </Text>
                <Text style={linkCardDescription}>
                  They fill out basic info, you call them back. Great for people who have questions
                  or want to talk before getting started.
                </Text>
                <Section style={linkBox}>
                  <Link href={contactFormLink} style={linkDisplay}>
                    {contactFormLink}
                  </Link>
                </Section>
                <Section style={buttonContainer}>
                  <Button style={secondaryButton} href={contactFormLink}>
                    Preview This Link
                  </Button>
                </Section>
              </Section>

              {/* Link 2: Intake Form */}
              <Section style={linkCardHighlight}>
                <Section style={linkCardHeader}>
                  <Text style={linkCardIcon}>📝</Text>
                  <Text style={linkCardLabelHighlight}>LINK 2: TAX INTAKE FORM</Text>
                </Section>
                <Text style={linkCardTitleHighlight}>
                  For people READY to get their taxes done NOW
                </Text>
                <Text style={linkCardDescriptionHighlight}>
                  They complete the full intake form with their tax information. Perfect for referrals
                  who are ready to file immediately!
                </Text>
                <Section style={linkBoxHighlight}>
                  <Link href={intakeFormLink} style={linkDisplayHighlight}>
                    {intakeFormLink}
                  </Link>
                </Section>
                <Section style={buttonContainer}>
                  <Button style={primaryButton} href={intakeFormLink}>
                    Preview This Link
                  </Button>
                </Section>
              </Section>

              <Section style={tipBox}>
                <Text style={tipText}>
                  💡 <strong>Pro Tip:</strong> Either way, you'll be notified and can call them!
                  The intake form just saves you a step since they've already provided their information.
                </Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* QR Code Section */}
            {qrCodeImageUrl && (
              <>
                <Section style={qrSection}>
                  <Heading style={sectionTitle}>📱 Your Personal QR Code</Heading>
                  <Text style={paragraph}>
                    This QR code has YOUR photo in the center! Print it on business cards, flyers,
                    or share it digitally. When scanned, it takes clients directly to your intake form.
                  </Text>
                  <Section style={qrCodeContainer}>
                    <Img
                      src={qrCodeImageUrl}
                      alt="Your Personal QR Code"
                      style={qrCode}
                    />
                  </Section>
                  <Text style={qrNote}>
                    📥 Download this QR code from your dashboard for high-resolution printing
                  </Text>
                </Section>
                <Hr style={hr} />
              </>
            )}

            {/* Social Media Sharing Section */}
            <Section style={socialSection}>
              <Heading style={sectionTitle}>📲 Share on Social Media</Heading>
              <Text style={paragraph}>
                Ready-to-post content for Instagram, Facebook, and text messages. Just copy, paste, and share!
              </Text>

              <Section style={socialCopyBox}>
                <Text style={socialCopyLabel}>COPY AND PASTE THIS:</Text>
                <Text style={socialCopyText}>{socialMediaCopy}</Text>
              </Section>

              {/* Marketing Images Grid - only show if images are provided */}
              {images.length > 0 && (
                <>
                  <Text style={imageGridTitle}>📸 Share These Images:</Text>
                  <Section style={imageGrid}>
                    {images.map((image, index) => (
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
                    Click images to download • More images available in your dashboard
                  </Text>
                </>
              )}

              {/* Social Share Buttons */}
              <Section style={socialButtonsContainer}>
                <Text style={socialButtonsLabel}>Quick Share:</Text>
                <Section style={socialButtons}>
                  <Link
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(intakeFormLink)}`}
                    style={socialButton}
                  >
                    Share on Facebook
                  </Link>
                  <Link
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Get your taxes done fast! Use my link: ${intakeFormLink} #TaxGenius #TaxSeason2025`)}`}
                    style={socialButton}
                  >
                    Share on X/Twitter
                  </Link>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Professional Email Feature */}
            {hasProfessionalEmail && professionalEmail && (
              <>
                <Section style={emailFeatureSection}>
                  <Heading style={sectionTitle}>📧 Your Professional Email</Heading>
                  <Section style={professionalEmailBox}>
                    <Text style={professionalEmailLabel}>Send emails from:</Text>
                    <Text style={professionalEmailAddress}>{professionalEmail}</Text>
                  </Section>
                  <Text style={paragraph}>
                    You can send emails that appear to come from your @taxgeniuspro.tax address!
                    This works with Gmail's "Send As" feature. Set it up in your dashboard under
                    <strong> Settings → Professional Email</strong>.
                  </Text>
                </Section>
                <Hr style={hr} />
              </>
            )}

            {/* Need Help Section */}
            <Section style={helpSection}>
              <Heading style={sectionTitle}>🆘 Need Help?</Heading>
              <Text style={paragraph}>
                Having trouble logging in or have questions? We're here for you!
              </Text>
              <Section style={contactGrid}>
                <Section style={contactItem}>
                  <Text style={contactIcon}>📧</Text>
                  <Text style={contactLabel}>Email</Text>
                  <Link href="mailto:iradwatkins@gmail.com" style={contactLink}>
                    iradwatkins@gmail.com
                  </Link>
                </Section>
                <Section style={contactItem}>
                  <Text style={contactIcon}>📞</Text>
                  <Text style={contactLabel}>Call or Text</Text>
                  <Link href="tel:+14046271015" style={contactLink}>
                    +1 404-627-1015
                  </Link>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Final CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaText}>Ready to crush tax season 2025?</Text>
              <Section style={buttonContainer}>
                <Button style={ctaButton} href={dashboardUrl}>
                  Go To My Dashboard
                </Button>
              </Section>
            </Section>

            {/* Signature */}
            <Section style={signatureSection}>
              <Text style={signatureGreeting}>Have a great tax season!</Text>
              <Img
                src="https://res.cloudinary.com/dhktmiigh/image/upload/v1765487887/taxgeniuspro/preparers/preparer_iw.jpg"
                alt="Ira Watkins"
                style={signatureAvatar}
              />
              <Text style={signatureName}>Ira Watkins</Text>
              <Text style={signatureTitle}>Founder, Tax Genius Pro</Text>
              <Text style={signatureCompany}>
                1632 Jonesboro Rd SE, Atlanta, GA 30315
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

export default TaxPreparerWelcome2025;

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
  maxWidth: '200px',
  height: 'auto',
};

const header = {
  background: brandGradient,
  padding: '40px 30px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
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

const greetingSection = {
  textAlign: 'center' as const,
  marginBottom: '20px',
};

const avatar = {
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  margin: '0 auto 15px auto',
  border: `4px solid ${brandGreen}`,
  objectFit: 'cover' as const,
};

const h2 = {
  color: brandGreen,
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
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

const sectionTitle = {
  color: brandGreen,
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
  textAlign: 'center' as const,
};

const sectionSubtitle = {
  color: '#666',
  fontSize: '16px',
  textAlign: 'center' as const,
  marginBottom: '25px',
};

// Card Styles
const cardSection = {
  textAlign: 'center' as const,
};

const card = {
  backgroundColor: '#f0fdf4',
  borderRadius: '16px',
  padding: '30px',
  border: `2px solid ${brandGreen}`,
};

const cardIcon = {
  fontSize: '48px',
  margin: '0 0 15px 0',
};

const cardTitle = {
  color: brandGreen,
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const cardText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px 0',
};

const cardNote = {
  color: '#666',
  fontSize: '14px',
  margin: '15px 0 0 0',
};

// Button Styles
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
  padding: '12px 30px',
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

// Links Section
const linksSection = {
  textAlign: 'center' as const,
};

const linkCard = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '25px',
  border: '2px solid #e0e0e0',
  marginBottom: '20px',
  textAlign: 'left' as const,
};

const linkCardHighlight = {
  backgroundColor: '#f0fdf4',
  borderRadius: '16px',
  padding: '25px',
  border: `3px solid ${brandGreen}`,
  marginBottom: '20px',
  textAlign: 'left' as const,
};

const linkCardHeader = {
  marginBottom: '15px',
};

const linkCardIcon = {
  fontSize: '24px',
  display: 'inline',
  marginRight: '10px',
};

const linkCardLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  display: 'inline',
};

const linkCardLabelHighlight = {
  color: brandGreen,
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  display: 'inline',
};

const linkCardTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const linkCardTitleHighlight = {
  color: brandGreen,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const linkCardDescription = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 15px 0',
};

const linkCardDescriptionHighlight = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 15px 0',
};

const linkBox = {
  backgroundColor: '#f5f5f5',
  padding: '15px',
  borderRadius: '8px',
  margin: '15px 0',
  border: '1px dashed #ccc',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
};

const linkBoxHighlight = {
  backgroundColor: '#ffffff',
  padding: '15px',
  borderRadius: '8px',
  margin: '15px 0',
  border: `2px dashed ${brandGreen}`,
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
};

const linkDisplay = {
  color: brandGreen,
  fontSize: '14px',
  textDecoration: 'none',
  fontFamily: 'monospace',
};

const linkDisplayHighlight = {
  color: brandGreen,
  fontSize: '14px',
  textDecoration: 'none',
  fontFamily: 'monospace',
  fontWeight: 'bold' as const,
};

const tipBox = {
  backgroundColor: brandYellow,
  padding: '20px',
  borderRadius: '12px',
  marginTop: '20px',
};

const tipText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

// QR Code Section
const qrSection = {
  textAlign: 'center' as const,
};

const qrCodeContainer = {
  margin: '25px 0',
  textAlign: 'center' as const,
};

const qrCode = {
  width: '200px',
  height: '200px',
  margin: '0 auto',
  borderRadius: '12px',
  border: `4px solid ${brandGreen}`,
};

const qrNote = {
  color: '#666',
  fontSize: '14px',
  margin: '15px 0 0 0',
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
  width: '150px',
  height: '150px',
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
  marginBottom: '10px',
};

const socialButtons = {
  textAlign: 'center' as const,
};

const socialButton = {
  backgroundColor: brandGreen,
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '10px 20px',
  margin: '0 5px',
  display: 'inline-block',
};

// Professional Email Section
const emailFeatureSection = {
  textAlign: 'center' as const,
};

const professionalEmailBox = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '12px',
  border: `2px solid ${brandGreen}`,
  margin: '20px 0',
};

const professionalEmailLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 5px 0',
};

const professionalEmailAddress = {
  color: brandGreen,
  fontSize: '24px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  margin: '0',
};

// Help Section
const helpSection = {
  textAlign: 'center' as const,
};

const contactGrid = {
  margin: '20px 0',
};

const contactItem = {
  display: 'inline-block' as const,
  width: '45%',
  padding: '20px',
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
};

const contactIcon = {
  fontSize: '32px',
  margin: '0 0 10px 0',
};

const contactLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 5px 0',
};

const contactLink = {
  color: brandGreen,
  fontSize: '14px',
  textDecoration: 'none',
  fontWeight: 'bold',
};

// Final CTA
const finalCta = {
  backgroundColor: brandYellow,
  borderRadius: '16px',
  padding: '35px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const finalCtaText = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
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
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  margin: '0 auto 10px auto',
  border: `3px solid ${brandGreen}`,
};

const signatureName = {
  color: brandGreen,
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const signatureTitle = {
  color: '#333',
  fontSize: '14px',
  margin: '0 0 5px 0',
};

const signatureCompany = {
  color: '#666',
  fontSize: '12px',
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
  margin: '0',
};
