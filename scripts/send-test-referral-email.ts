import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ReferralInvitationEmail } from '../emails/referral-invitation';
import * as fs from 'fs';

async function sendTestEmail() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailProps = {
    clientName: 'Ira',
    preparerName: 'Gelisa White',
    taxYear: 2025,
    refundAmount: 3250,
    referralLink: 'https://taxgeniuspro.tax/en/landing?ref=gw&r=1',
    referralCode: 'gw',
  };

  const html = await render(ReferralInvitationEmail(emailProps));

  // Save preview
  fs.mkdirSync('public/email-previews', { recursive: true });
  fs.writeFileSync('public/email-previews/referral-invitation-proof.html', html);
  console.log('Preview saved to: public/email-previews/referral-invitation-proof.html');

  const { data, error } = await resend.emails.send({
    from: 'Tax Genius Pro <hello@taxgeniuspro.tax>',
    to: 'iradwatkins@gmail.com',
    subject: 'Hey Ira! Your 2025 Return is Complete - Now Let\'s Make You Some Money!',
    html: html,
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Email sent successfully! ID:', data?.id);
}

sendTestEmail();
