import { render } from '@react-email/render';
import { TaxPreparerWelcomeEmail } from '../emails/TaxPreparerWelcomeEmail';
import { PreparerApplicationRejected } from '../emails/preparer-application-rejected';
import { ReferralInvitationEmail } from '../emails/referral-invitation';
import * as fs from 'fs';
import * as path from 'path';

async function generatePreviews() {
  const outputDir = path.join(process.cwd(), 'test-results', 'email-previews');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating email previews...\n');

  // 1. Tax Preparer Welcome Email
  const welcomeHtml = await render(
    TaxPreparerWelcomeEmail({
      name: 'Sarah Wilson',
      email: 'sarah.wilson@example.com',
      trackingCode: 'sw',
      magicLinkUrl: 'https://taxgeniuspro.tax/auth/verify?token=abc123xyz',
      expiresIn: '24 hours',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'welcome-email.html'), welcomeHtml);
  console.log('✅ Generated: welcome-email.html');

  // 2. Rejection Email - No Conversion
  const rejectionNoConversionHtml = await render(
    PreparerApplicationRejected({
      firstName: 'John',
      rejectionReason: 'We are currently focusing on candidates with more experience in tax preparation software.',
      convertedTo: null,
      locale: 'en',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'rejection-no-conversion.html'), rejectionNoConversionHtml);
  console.log('✅ Generated: rejection-no-conversion.html');

  // 3. Rejection Email - Converted to Client
  const rejectionClientHtml = await render(
    PreparerApplicationRejected({
      firstName: 'Maria',
      rejectionReason: undefined,
      convertedTo: 'client',
      locale: 'en',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'rejection-client-conversion.html'), rejectionClientHtml);
  console.log('✅ Generated: rejection-client-conversion.html');

  // 4. Rejection Email - Converted to Affiliate
  const rejectionAffiliateHtml = await render(
    PreparerApplicationRejected({
      firstName: 'Carlos',
      rejectionReason: undefined,
      convertedTo: 'affiliate',
      locale: 'en',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'rejection-affiliate-conversion.html'), rejectionAffiliateHtml);
  console.log('✅ Generated: rejection-affiliate-conversion.html');

  // 5. Rejection Email - Spanish
  const rejectionSpanishHtml = await render(
    PreparerApplicationRejected({
      firstName: 'Ana',
      rejectionReason: undefined,
      convertedTo: 'client',
      locale: 'es',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'rejection-spanish.html'), rejectionSpanishHtml);
  console.log('✅ Generated: rejection-spanish.html');

  // 6. Client Referral Invitation - Basic
  const referralBasicHtml = await render(
    ReferralInvitationEmail({
      clientName: 'Ira',
      preparerName: 'Owliver',
      taxYear: 2024,
      referralLink: 'https://taxgeniuspro.tax/en/landing?ref=ow',
      referralCode: 'Fw8jWm9',
    })
  );

  fs.writeFileSync(path.join(outputDir, 'referral-invitation-basic.html'), referralBasicHtml);
  console.log('✅ Generated: referral-invitation-basic.html');

  // 7. Client Referral Invitation - With Refund & Images
  const referralFullHtml = await render(
    ReferralInvitationEmail({
      clientName: 'Maria',
      preparerName: 'Gelisa White',
      taxYear: 2024,
      refundAmount: 3250,
      referralLink: 'https://taxgeniuspro.tax/en/landing?ref=gw',
      referralCode: 'Abc123X',
      images: [
        { url: 'https://via.placeholder.com/400x400?text=Tax+Genius+1', alt: 'Promotional Image 1' },
        { url: 'https://via.placeholder.com/400x400?text=Tax+Genius+2', alt: 'Promotional Image 2' },
        { url: 'https://via.placeholder.com/400x400?text=Tax+Genius+3', alt: 'Promotional Image 3' },
        { url: 'https://via.placeholder.com/400x400?text=Tax+Genius+4', alt: 'Promotional Image 4' },
      ],
    })
  );

  fs.writeFileSync(path.join(outputDir, 'referral-invitation-full.html'), referralFullHtml);
  console.log('✅ Generated: referral-invitation-full.html');

  console.log(`\n📁 All previews saved to: ${outputDir}`);
  console.log('\nOpen the HTML files in a browser to preview the emails.');
}

generatePreviews().catch(console.error);
