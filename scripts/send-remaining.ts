import { Resend } from 'resend';
import { PreparerApplicationRejected } from '../emails/preparer-application-rejected';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendRemaining() {
  const toEmail = 'iradwatkins@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

  console.log('Sending remaining test emails...');

  // Client Conversion
  const r1 = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: '[TEST] Tax Genius Pro - Application Update (Client Conversion)',
    react: PreparerApplicationRejected({
      firstName: 'Ira',
      convertedTo: 'client',
      locale: 'en',
    }),
  });
  console.log('Client conversion:', r1.data?.id || r1.error);

  await new Promise(r => setTimeout(r, 1500));

  // Affiliate Conversion
  const r2 = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: '[TEST] Tax Genius Pro - Application Update (Affiliate Conversion)',
    react: PreparerApplicationRejected({
      firstName: 'Ira',
      convertedTo: 'affiliate',
      locale: 'en',
    }),
  });
  console.log('Affiliate conversion:', r2.data?.id || r2.error);

  console.log('Done! Check your inbox.');
}

sendRemaining();
