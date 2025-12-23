import * as React from 'react';
import { render } from '@react-email/render';
import { ReferralInvitationEmail } from '../emails/referral-invitation';
import * as fs from 'fs';

async function main() {
  const html = await render(
    ReferralInvitationEmail({
      clientName: 'Ira',
      preparerName: 'Gelisa White',
      taxYear: 2024,
      refundAmount: 3250,
      referralLink: 'https://taxgeniuspro.tax/en/landing?ref=gw',
      referralCode: 'gw',
    })
  );
  
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/referral-proof.html', html);
  console.log('Created: test-results/referral-proof.html');
}

main().catch(console.error);
