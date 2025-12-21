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

interface CashAdvancePromo2025Props {
  recipientName: string;
  recipientFirstName: string;
  trackingCode: string;
  cashAdvanceLink?: string;
  intakeFormLink?: string;
  qrCodeImageUrl?: string;
  preparerName?: string;
  preparerAvatarUrl?: string;
  preparerPhone?: string;
}

export const CashAdvancePromo2025 = ({
  recipientName = 'Friend',
  recipientFirstName = 'Friend',
  trackingCode = 'ow',
  cashAdvanceLink,
  intakeFormLink,
  qrCodeImageUrl,
  preparerName = 'Tax Genius Pro',
  preparerAvatarUrl,
  preparerPhone = '+1 404-627-1015',
}: CashAdvancePromo2025Props) => {
  const advanceLink = cashAdvanceLink || `https://taxgeniuspro.tax/cash-advance?ref=${trackingCode}`;
  const intakeLink = intakeFormLink || `https://taxgeniuspro.tax/go/${trackingCode}-intake`;

  const socialMediaCopy = `TAX SEASON 2025 IS HERE! Get up to $7,000 BEFORE your refund arrives - NO credit check, 0% APR!

Self-employed? 1099 workers? Gig economy hustlers? This is YOUR time to shine!

Apply now: ${advanceLink}

#TaxSeason2025 #CashAdvance #GetPaidNow #SelfEmployed #1099 #GigWorkers #TaxGenius`;

  return (
    <Html>
      <Head />
      <Preview>
        TAX SEASON 2025 IS HERE! Get Up To $7,000 Cash NOW - No Credit Check! Your Best Tax Season Yet!
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

          {/* EXPLOSIVE Hero Header */}
          <Section style={header}>
            <Text style={celebrationEmoji}>🎉🔥💰🔥🎉</Text>
            <Heading style={h1}>TAX SEASON 2025 IS HERE!</Heading>
            <Text style={headerBigMoney}>Get Up To $7,000</Text>
            <Text style={headerSubtext}>Cash In Your Pocket - BEFORE Your Refund!</Text>
            <Section style={badgeContainer}>
              <Text style={headerBadge}>STARTS JANUARY 2ND!</Text>
              <Text style={urgencyBadge}>LIMITED SPOTS AVAILABLE</Text>
            </Section>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={excitedGreeting}>Hey {recipientFirstName}! Ready for YOUR Best Tax Season Yet?</Text>

            <Section style={excitementBox}>
              <Text style={excitementEmoji}>🚀</Text>
              <Text style={excitementText}>
                This is IT! The moment self-employed go-getters, 1099 hustlers, and gig economy warriors
                have been waiting for. Tax Season 2025 is about to be <strong>LEGENDARY</strong>!
              </Text>
            </Section>

            <Text style={paragraph}>
              Why wait weeks (or months!) for the IRS to send your refund? With Tax Genius Pro's
              <strong> Pre-Season Cash Advance</strong>, you can put up to <strong style={{color: brandGreen, fontSize: '22px'}}>$7,000</strong> in
              your bank account - often <strong>THE SAME DAY</strong>!
            </Text>

            <Hr style={hr} />

            {/* WHO IS THIS FOR Section */}
            <Section style={whoSection}>
              <Heading style={h2}>This is PERFECT For You If...</Heading>

              <Section style={checklistContainer}>
                <Text style={checklistItem}>✅ You're SELF-EMPLOYED and ready to get what you earned</Text>
                <Text style={checklistItem}>✅ You have 1099 income from gigs, freelance, or side hustles</Text>
                <Text style={checklistItem}>✅ You're tired of WAITING for your hard-earned money</Text>
                <Text style={checklistItem}>✅ You want to start 2025 with CASH IN HAND</Text>
                <Text style={checklistItem}>✅ You've got bills, dreams, or goals that can't wait!</Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Amazing Benefits Section */}
            <Section style={benefitsSection}>
              <Heading style={h2}>Why Everyone Is Talking About This!</Heading>

              <Section style={benefitsGrid}>
                <Section style={benefitCard}>
                  <Text style={benefitIcon}>💵</Text>
                  <Text style={benefitTitle}>UP TO $7,000</Text>
                  <Text style={benefitText}>Based on YOUR refund - the bigger your refund, the more you get!</Text>
                </Section>

                <Section style={benefitCard}>
                  <Text style={benefitIcon}>🚫</Text>
                  <Text style={benefitTitle}>NO CREDIT CHECK</Text>
                  <Text style={benefitText}>Bad credit? No credit? NO PROBLEM! Approval based on YOUR refund</Text>
                </Section>

                <Section style={benefitCard}>
                  <Text style={benefitIcon}>0️⃣</Text>
                  <Text style={benefitTitle}>0% APR - ZERO!</Text>
                  <Text style={benefitText}>Not a penny in interest. It's YOUR money - keep it ALL!</Text>
                </Section>

                <Section style={benefitCard}>
                  <Text style={benefitIcon}>⚡</Text>
                  <Text style={benefitTitle}>SAME-DAY CASH</Text>
                  <Text style={benefitText}>Apply today, money in your account TODAY*</Text>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* MASSIVE CTA Section */}
            <Section style={massiveCtaSection}>
              <Text style={massiveCtaEmoji}>🔥🔥🔥</Text>
              <Heading style={massiveCtaTitle}>DON'T WAIT - ACT NOW!</Heading>
              <Text style={massiveCtaSubtext}>
                Every year, people miss out because they waited too long.
                <br />
                <strong>Don't let that be YOU!</strong>
              </Text>

              <Section style={buttonContainer}>
                <Button style={primaryButton} href={advanceLink}>
                  YES! I WANT MY $7,000 NOW!
                </Button>
              </Section>

              <Text style={ctaNote}>
                🔒 Takes just 60 seconds | 100% Secure | No obligation
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Self-Employed Callout */}
            <Section style={selfEmployedSection}>
              <Text style={selfEmployedIcon}>💼</Text>
              <Heading style={selfEmployedTitle}>ATTENTION SELF-EMPLOYED!</Heading>
              <Text style={selfEmployedText}>
                You worked HARD all year - driving Uber, doing DoorDash, freelancing, running your business.
                Now it's time to <strong>GET PAID</strong>!
              </Text>
              <Text style={selfEmployedText}>
                Self-employed filers often get the <strong>BIGGEST refunds</strong> thanks to all those
                deductions. Don't leave money on the table - let us help you get EVERY dollar you deserve!
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Quick & Easy Steps */}
            <Section style={howItWorksSection}>
              <Heading style={h2}>How Quick Is It? THIS Quick!</Heading>

              <Section style={stepsContainer}>
                <Section style={stepItem}>
                  <Text style={stepNumber}>1</Text>
                  <Section style={stepContent}>
                    <Text style={stepTitle}>60 Seconds to Apply</Text>
                    <Text style={stepText}>Fill out a super quick form - literally takes a minute!</Text>
                  </Section>
                </Section>

                <Section style={stepItem}>
                  <Text style={stepNumber}>2</Text>
                  <Section style={stepContent}>
                    <Text style={stepTitle}>We Call YOU Same Day</Text>
                    <Text style={stepText}>Get approved fast - no waiting around!</Text>
                  </Section>
                </Section>

                <Section style={stepItem}>
                  <Text style={stepNumber}>3</Text>
                  <Section style={stepContent}>
                    <Text style={stepTitle}>Money Hits Your Account</Text>
                    <Text style={stepText}>See that deposit notification - feels AMAZING!</Text>
                  </Section>
                </Section>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* Testimonial-Style Section */}
            <Section style={socialProofSection}>
              <Heading style={h2}>Join Thousands Getting Paid Early!</Heading>
              <Text style={socialProofText}>
                "I got $5,200 deposited the same day! Now I can start the new year right!"
                <br />
                <span style={{fontWeight: 'bold', color: brandGreen}}>- Marcus T., Atlanta</span>
              </Text>
              <Text style={socialProofText}>
                "As a self-employed graphic designer, this was a game-changer. No more waiting for the IRS!"
                <br />
                <span style={{fontWeight: 'bold', color: brandGreen}}>- Keisha R., DoorDash Driver</span>
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Preparer Info Card */}
            {preparerName && (
              <>
                <Section style={preparerSection}>
                  <Text style={preparerLabel}>YOUR TAX GENIUS IS READY!</Text>
                  <Section style={preparerCard}>
                    {preparerAvatarUrl && (
                      <Img
                        src={preparerAvatarUrl}
                        alt={preparerName}
                        style={preparerAvatar}
                      />
                    )}
                    <Section style={preparerInfo}>
                      <Text style={preparerNameText}>{preparerName}</Text>
                      <Text style={preparerTitle}>Your Personal Tax Pro</Text>
                      {preparerPhone && (
                        <Link href={`tel:${preparerPhone.replace(/[^+\d]/g, '')}`} style={preparerPhoneLink}>
                          Call Now: {preparerPhone}
                        </Link>
                      )}
                    </Section>
                  </Section>
                </Section>
                <Hr style={hr} />
              </>
            )}

            {/* Social Media Sharing */}
            <Section style={socialSection}>
              <Heading style={h2}>Know Someone Who Needs This?</Heading>
              <Text style={paragraph}>
                Got friends hustling in the gig economy? Family members who are self-employed?
                <strong> Share this opportunity</strong> - they'll thank you!
              </Text>

              <Section style={socialCopyBox}>
                <Text style={socialCopyLabel}>TAP & SHARE THIS:</Text>
                <Text style={socialCopyText}>{socialMediaCopy}</Text>
              </Section>

              {/* Quick Share Buttons */}
              <Section style={socialButtonsContainer}>
                <Text style={socialButtonsLabel}>Quick Share:</Text>
                <Section style={socialButtons}>
                  <Link
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(advanceLink)}&quote=${encodeURIComponent('Get up to $7,000 cash advance - No credit check! Tax Season 2025!')}`}
                    style={facebookButton}
                  >
                    Facebook
                  </Link>
                  <Link
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`TAX SEASON 2025! Get up to $7,000 before your refund! NO credit check! ${advanceLink} #TaxSeason2025`)}`}
                    style={twitterButton}
                  >
                    Twitter/X
                  </Link>
                  <Link
                    href={`https://wa.me/?text=${encodeURIComponent(`Hey! Tax season 2025 is here! You can get up to $7,000 cash advance on your tax refund - NO credit check! Check it out: ${advanceLink}`)}`}
                    style={whatsappButton}
                  >
                    WhatsApp
                  </Link>
                </Section>
              </Section>
            </Section>

            {/* QR Code if available */}
            {qrCodeImageUrl && (
              <>
                <Hr style={hr} />
                <Section style={qrSection}>
                  <Heading style={h2}>Scan & Apply Instantly!</Heading>
                  <Section style={qrCodeContainer}>
                    <Img
                      src={qrCodeImageUrl}
                      alt="Scan to Apply for Cash Advance"
                      style={qrCode}
                    />
                  </Section>
                  <Text style={qrNote}>
                    Point your phone camera here - takes you right to the application!
                  </Text>
                </Section>
              </>
            )}

            <Hr style={hr} />

            {/* FINAL MASSIVE CTA */}
            <Section style={finalCta}>
              <Text style={finalCtaEmoji}>🎯💰🎯</Text>
              <Text style={finalCtaText}>2025 IS YOUR YEAR!</Text>
              <Text style={finalCtaSubtext}>
                Tax season starts January 2nd. Don't be left behind!
                <br />
                <strong>GET. YOUR. MONEY. NOW.</strong>
              </Text>
              <Section style={buttonContainer}>
                <Button style={ctaButton} href={advanceLink}>
                  APPLY NOW - GET UP TO $7,000!
                </Button>
              </Section>
              <Text style={finalCtaSmall}>
                Click above or call {preparerPhone || '+1 404-627-1015'} right now!
              </Text>
            </Section>

            {/* Countdown Urgency */}
            <Section style={urgencySection}>
              <Text style={urgencyText}>
                Every minute you wait is a minute longer before money hits your account.
                <br />
                <strong>Apply right now - it only takes 60 seconds!</strong>
              </Text>
            </Section>

            {/* Disclaimer */}
            <Section style={disclaimerSection}>
              <Text style={disclaimerText}>
                *Advance amounts based on eligibility, IRS acceptance, and bank approval.
                Not all applicants qualify for the maximum amount. Funding timing varies by bank.
                0% APR and $0 loan fees. Tax preparation fees apply.
              </Text>
            </Section>

            {/* Signature */}
            <Section style={signatureSection}>
              <Text style={signatureGreeting}>Here's to YOUR best tax season ever!</Text>
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
                Unsubscribe from promotional emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CashAdvancePromo2025;

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

const celebrationEmoji = {
  fontSize: '40px',
  margin: '0 0 10px 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const headerBigMoney = {
  color: brandYellow,
  fontSize: '52px',
  fontWeight: 'bold',
  margin: '10px 0',
  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
};

const headerSubtext = {
  color: '#ffffff',
  fontSize: '20px',
  margin: '0 0 20px 0',
  opacity: '0.95',
};

const badgeContainer = {
  textAlign: 'center' as const,
};

const headerBadge = {
  backgroundColor: brandYellow,
  color: '#333',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '8px 20px',
  borderRadius: '20px',
  display: 'inline-block',
  margin: '5px',
};

const urgencyBadge = {
  backgroundColor: '#ff4444',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  padding: '6px 16px',
  borderRadius: '20px',
  display: 'inline-block',
  margin: '5px',
};

const content = {
  padding: '30px',
};

const excitedGreeting = {
  color: brandGreen,
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const excitementBox = {
  backgroundColor: '#fff8e1',
  border: `3px solid ${brandYellow}`,
  borderRadius: '16px',
  padding: '25px',
  textAlign: 'center' as const,
  marginBottom: '25px',
};

const excitementEmoji = {
  fontSize: '50px',
  margin: '0 0 10px 0',
};

const excitementText = {
  color: '#333',
  fontSize: '18px',
  lineHeight: '28px',
  margin: '0',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const h2 = {
  color: brandGreen,
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

// Who Section
const whoSection = {
  backgroundColor: '#f0fdf4',
  padding: '30px',
  borderRadius: '16px',
  border: `2px solid ${brandGreen}`,
};

const checklistContainer = {
  margin: '15px 0',
};

const checklistItem = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
  paddingLeft: '10px',
};

// Benefits Section
const benefitsSection = {
  textAlign: 'center' as const,
};

const benefitsGrid = {
  margin: '20px 0',
};

const benefitCard = {
  display: 'inline-block' as const,
  width: '45%',
  padding: '20px 10px',
  margin: '10px 2%',
  backgroundColor: '#f0fdf4',
  borderRadius: '12px',
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
  border: `2px solid ${brandGreenLight}`,
};

const benefitIcon = {
  fontSize: '40px',
  margin: '0 0 10px 0',
};

const benefitTitle = {
  color: brandGreen,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const benefitText = {
  color: '#666',
  fontSize: '13px',
  margin: '0',
  lineHeight: '18px',
};

// Massive CTA Section
const massiveCtaSection = {
  textAlign: 'center' as const,
  backgroundColor: brandYellow,
  padding: '40px 30px',
  borderRadius: '20px',
  margin: '20px 0',
  border: '4px solid #e6c632',
};

const massiveCtaEmoji = {
  fontSize: '40px',
  margin: '0 0 15px 0',
};

const massiveCtaTitle = {
  color: '#333',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const massiveCtaSubtext = {
  color: '#333',
  fontSize: '18px',
  lineHeight: '26px',
  margin: '0 0 25px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const primaryButton = {
  backgroundColor: brandGreen,
  borderRadius: '50px',
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '20px 45px',
  boxShadow: '0 6px 20px rgba(64, 136, 81, 0.5)',
};

const ctaButton = {
  backgroundColor: brandYellow,
  borderRadius: '50px',
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '20px 50px',
  boxShadow: '0 6px 20px rgba(249, 217, 56, 0.5)',
  border: '3px solid #333',
};

const ctaNote = {
  color: '#333',
  fontSize: '14px',
  margin: '15px 0 0 0',
};

// Self-Employed Section
const selfEmployedSection = {
  backgroundColor: '#e8f5e9',
  padding: '30px',
  borderRadius: '16px',
  textAlign: 'center' as const,
  border: `3px solid ${brandGreen}`,
};

const selfEmployedIcon = {
  fontSize: '50px',
  margin: '0 0 15px 0',
};

const selfEmployedTitle = {
  color: brandGreen,
  fontSize: '26px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const selfEmployedText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '10px 0',
};

// How It Works
const howItWorksSection = {
  backgroundColor: '#f9fafb',
  padding: '30px',
  borderRadius: '16px',
};

const stepsContainer = {
  margin: '20px 0',
};

const stepItem = {
  marginBottom: '25px',
};

const stepNumber = {
  backgroundColor: brandGreen,
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  width: '40px',
  height: '40px',
  lineHeight: '40px',
  borderRadius: '50%',
  display: 'inline-block',
  textAlign: 'center' as const,
  marginRight: '15px',
  verticalAlign: 'top',
};

const stepContent = {
  display: 'inline-block' as const,
  width: 'calc(100% - 65px)',
  verticalAlign: 'top',
};

const stepTitle = {
  color: brandGreen,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const stepText = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

// Social Proof
const socialProofSection = {
  backgroundColor: '#fff8e1',
  padding: '25px',
  borderRadius: '16px',
  textAlign: 'center' as const,
};

const socialProofText = {
  color: '#333',
  fontSize: '15px',
  fontStyle: 'italic' as const,
  lineHeight: '24px',
  margin: '15px 0',
};

// Preparer Section
const preparerSection = {
  textAlign: 'center' as const,
};

const preparerLabel = {
  color: brandGreen,
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  marginBottom: '15px',
};

const preparerCard = {
  backgroundColor: '#f0fdf4',
  padding: '25px',
  borderRadius: '16px',
  border: `3px solid ${brandGreen}`,
  textAlign: 'center' as const,
};

const preparerAvatar = {
  width: '90px',
  height: '90px',
  borderRadius: '50%',
  margin: '0 auto 15px auto',
  border: `4px solid ${brandGreen}`,
};

const preparerInfo = {
  textAlign: 'center' as const,
};

const preparerNameText = {
  color: brandGreen,
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const preparerTitle = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 10px 0',
};

const preparerPhoneLink = {
  color: '#ffffff',
  backgroundColor: brandGreen,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '10px 20px',
  borderRadius: '25px',
  display: 'inline-block',
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
  borderRadius: '25px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  margin: '5px',
  display: 'inline-block',
};

const twitterButton = {
  backgroundColor: '#1DA1F2',
  borderRadius: '25px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  margin: '5px',
  display: 'inline-block',
};

const whatsappButton = {
  backgroundColor: '#25D366',
  borderRadius: '25px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  margin: '5px',
  display: 'inline-block',
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

const qrNote = {
  color: '#666',
  fontSize: '14px',
  margin: '10px 0 0 0',
};

// Final CTA
const finalCta = {
  backgroundColor: brandGreen,
  borderRadius: '20px',
  padding: '40px',
  textAlign: 'center' as const,
};

const finalCtaEmoji = {
  fontSize: '48px',
  margin: '0 0 15px 0',
};

const finalCtaText = {
  color: brandYellow,
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const finalCtaSubtext = {
  color: 'rgba(255,255,255,0.95)',
  fontSize: '18px',
  lineHeight: '28px',
  margin: '0 0 25px 0',
};

const finalCtaSmall = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '14px',
  margin: '15px 0 0 0',
};

// Urgency Section
const urgencySection = {
  backgroundColor: '#fff3cd',
  padding: '20px',
  borderRadius: '12px',
  marginTop: '20px',
  textAlign: 'center' as const,
  border: '2px solid #ffc107',
};

const urgencyText = {
  color: '#856404',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

// Disclaimer
const disclaimerSection = {
  backgroundColor: '#f9fafb',
  padding: '15px',
  borderRadius: '8px',
  marginTop: '20px',
};

const disclaimerText = {
  color: '#999',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '0',
  textAlign: 'center' as const,
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
  fontSize: '18px',
  fontStyle: 'italic' as const,
  margin: '0 0 20px 0',
};

const signatureAvatar = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  margin: '0 auto 10px auto',
  border: `4px solid ${brandGreen}`,
};

const signatureName = {
  color: brandGreen,
  fontSize: '20px',
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
