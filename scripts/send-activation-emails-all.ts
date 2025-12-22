import { Resend } from 'resend';
import * as dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY?.trim().replace(/\\n/g, ''));

// All 32 unregistered tax preparers
const preparers = [
  { firstName: 'Alicia', lastName: 'Adams', code: 'aa', email: 'caydensmother29@gmail.com' },
  { firstName: 'Angela', lastName: 'Richards', code: 'ar', email: 'angeladesigndocs@gmail.com' },
  { firstName: 'Anita', lastName: 'Wilson', code: 'aw', email: 'anita@cm3mediagroup.pro' },
  { firstName: 'Brandon', lastName: 'Hawkins', code: 'bh', email: 'busyb101@gmail.com' },
  { firstName: 'Carlton', lastName: 'Gannaway', code: 'cg', email: 'f.alawishez@gmail.com' },
  { firstName: 'Ceia', lastName: 'Stewart', code: 'cs', email: 'consult.me@mail.com' },
  { firstName: 'Chelsea', lastName: 'Lowe', code: 'cl', email: 'c.mitchell.lowe@gmail.com' },
  { firstName: 'Cynthia', lastName: 'Bacon-Whitted', code: 'cbw', email: 'cbawhitted@gmail.com' },
  { firstName: 'Derrick', lastName: 'Stewart', code: 'ds', email: 'derrick.stewart31@yahoo.com' },
  { firstName: 'Devlin', lastName: 'Watkins', code: 'dw', email: 'iradwatkins+dw@gmail.com' },
  { firstName: 'Devon', lastName: 'Hamilton', code: 'dh', email: 'gxldmxb@gmail.com' },
  { firstName: 'Erica', lastName: 'Bridges', code: 'eb', email: 'msboss110284@gmail.com' },
  { firstName: 'Gregory', lastName: 'Edwards', code: 'ge', email: 'gregthetaxgenius@gmail.com' },
  { firstName: 'Helen', lastName: 'Holmes', code: 'hh', email: 'holmeshelen@yahoo.com' },
  { firstName: 'Iran', lastName: 'Watkins', code: 'iw1', email: 'iradwatkins+iw1@gmail.com' },
  { firstName: 'Jamel', lastName: 'Pringle', code: 'jp', email: 'melpringle38@gmail.com' },
  { firstName: 'Javarre', lastName: 'Massey', code: 'jm', email: 'javareemassey@gmail.com' },
  { firstName: 'Katie', lastName: 'Winborn', code: 'kw', email: 'winbornkatie@gmail.com' },
  { firstName: 'Kemnetta', lastName: 'Pillette', code: 'kp', email: 'kpillette7@gmail.com' },
  { firstName: 'LaJuana', lastName: 'Frost', code: 'lf', email: 'lajuanafrost@gmail.com' },
  { firstName: 'Lenore', lastName: 'Bohanon', code: 'lb', email: 'lbohanon398@gmail.com' },
  { firstName: 'Mariah', lastName: 'Johnson', code: 'mj', email: 'msj1solution@gmail.com' },
  { firstName: 'Michael', lastName: 'Finley', code: 'mf', email: 'mrmikefinley@gmail.com' },
  { firstName: 'Pamela', lastName: 'Johnson', code: 'pj', email: 'pamelajatl3@gmail.com' },
  { firstName: 'Sarah', lastName: 'Wilson', code: 'sw', email: 'hest8133@bellsouth.net' },
  { firstName: 'Shakia', lastName: 'Gibbs', code: 'sj', email: 'shakiragibbs12@gmail.com' },
  { firstName: 'Tiffany & Jakobe', lastName: 'Pearson', code: 'tp', email: 'jakobepearson18@gmail.com' },
  { firstName: 'Trevor', lastName: 'Wikerson', code: 'tw', email: 'tjbw2005@gmail.com' },
  { firstName: 'Wendy', lastName: 'Casimir', code: 'wc', email: 'wendycasimir@gmail.com' },
  { firstName: 'Yaumar', lastName: 'Williams', code: 'yw', email: 'yaumarwilliams@gmail.com' },
];

function getEmailHtml(firstName: string, trackingCode: string, avatarUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tax Genius Pro Account is Ready!</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: linear-gradient(180deg, #dcfce7 0%, #f0fdf4 50%, #ffffff 100%);
      margin: 0;
      padding: 20px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(34, 197, 94, 0.2);
      border: 3px solid #22c55e;
    }

    .hero-banner {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }

    .header {
      background: linear-gradient(135deg, #22c55e 0%, #15803d 50%, #166534 100%);
      padding: 40px 30px 50px;
      text-align: center;
      position: relative;
    }

    .header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 40px solid transparent;
      border-right: 40px solid transparent;
      border-top: 20px solid #166534;
    }

    .header img.avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 5px solid #ffffff;
      margin-bottom: 20px;
      object-fit: cover;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }

    .header h1 {
      color: white;
      font-size: 36px;
      font-weight: 900;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    .header .emoji-burst {
      font-size: 32px;
      margin: 10px 0;
    }

    .header p {
      color: #bbf7d0;
      font-size: 18px;
      margin: 10px 0 0 0;
      font-weight: 500;
    }

    .urgency-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #1a1a1a;
      padding: 8px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 800;
      margin-top: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 22px;
      margin-bottom: 15px;
      color: #166534;
      font-weight: 600;
    }

    .intro-text {
      color: #374151;
      font-size: 17px;
      margin-bottom: 30px;
      line-height: 1.7;
    }

    .intro-text strong {
      color: #22c55e;
      font-weight: 700;
    }

    .section-title {
      color: #166534;
      font-size: 28px;
      font-weight: 900;
      margin: 35px 0 25px 0;
      text-align: center;
      background: linear-gradient(90deg, #22c55e, #15803d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .feature-image {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 25px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .feature-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #86efac;
      padding: 25px;
      margin: 20px 0;
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(34, 197, 94, 0.15);
      position: relative;
      overflow: hidden;
    }

    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
      background: linear-gradient(180deg, #22c55e, #15803d);
    }

    .feature-card h3 {
      color: #166534;
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 12px 0;
      padding-left: 10px;
    }

    .feature-card h3 .emoji {
      font-size: 24px;
      margin-right: 8px;
    }

    .feature-card p {
      color: #374151;
      font-size: 16px;
      margin: 0;
      padding-left: 10px;
      line-height: 1.6;
    }

    .feature-card ul {
      margin: 12px 0 0 0;
      padding-left: 30px;
      color: #374151;
      font-size: 15px;
    }

    .feature-card li {
      margin: 10px 0;
      position: relative;
    }

    .feature-card li::marker {
      color: #22c55e;
    }

    .links-section {
      background: linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%);
      border-radius: 20px;
      padding: 30px;
      margin: 35px 0;
      box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
    }

    .links-section h4 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 8px 0;
      text-align: center;
    }

    .links-section .subtitle {
      color: #bbf7d0;
      font-size: 14px;
      text-align: center;
      margin-bottom: 20px;
    }

    .link-item {
      background: rgba(255,255,255,0.95);
      border-radius: 12px;
      padding: 18px;
      margin: 12px 0;
      display: block;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .link-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .link-label {
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }

    .link-url {
      color: #22c55e;
      font-size: 16px;
      font-weight: 700;
      word-break: break-all;
    }

    .link-emoji {
      float: right;
      font-size: 24px;
    }

    .steps-section {
      background: #ffffff;
      border: 3px solid #22c55e;
      border-radius: 20px;
      padding: 30px;
      margin: 35px 0;
      position: relative;
    }

    .steps-section::before {
      content: '🚀';
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 40px;
      background: #ffffff;
      padding: 0 15px;
    }

    .steps-section h3 {
      color: #166534;
      font-size: 24px;
      font-weight: 800;
      margin: 10px 0 25px 0;
      text-align: center;
    }

    .step {
      display: flex;
      align-items: center;
      margin: 18px 0;
      padding: 15px;
      background: #f0fdf4;
      border-radius: 12px;
      border: 1px solid #bbf7d0;
    }

    .step-number {
      background: linear-gradient(135deg, #22c55e, #15803d);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      margin-right: 18px;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3);
    }

    .step-text {
      color: #374151;
      font-size: 16px;
      font-weight: 500;
    }

    .step-text strong {
      color: #166534;
      font-weight: 700;
    }

    .cta-section {
      text-align: center;
      padding: 20px 0 30px;
    }

    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
      color: white;
      text-align: center;
      padding: 22px 50px;
      text-decoration: none;
      border-radius: 50px;
      font-size: 22px;
      font-weight: 800;
      box-shadow: 0 8px 30px rgba(34, 197, 94, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cta-subtext {
      color: #6b7280;
      font-size: 14px;
      margin-top: 12px;
    }

    .more-features {
      text-align: center;
      color: #22c55e;
      font-size: 20px;
      font-weight: 800;
      margin: 30px 0;
    }

    .divider {
      height: 4px;
      background: linear-gradient(90deg, transparent, #22c55e, transparent);
      margin: 30px 0;
      border-radius: 2px;
    }

    .footer {
      background: linear-gradient(135deg, #166534 0%, #15803d 100%);
      padding: 35px 30px;
      text-align: center;
    }

    .footer-emoji {
      font-size: 40px;
      margin-bottom: 15px;
    }

    .footer-contact {
      color: #bbf7d0;
      font-size: 16px;
      margin-bottom: 8px;
    }

    .footer-phone {
      color: white;
      font-size: 32px;
      font-weight: 900;
      text-decoration: none;
      display: block;
      margin-bottom: 20px;
    }

    .footer-tagline {
      color: #86efac;
      font-size: 16px;
      font-weight: 600;
    }

    .footer-brand {
      color: #ffffff;
      display: block;
      margin-top: 8px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Hero Image -->
    <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=200&fit=crop" alt="Tax Season" class="hero-banner">

    <div class="header">
      <img src="${avatarUrl}" alt="${firstName}" class="avatar">
      <div class="emoji-burst">🎉 🎊 ✨</div>
      <h1>Your Account is Ready!</h1>
      <p>Welcome to Tax Genius Pro, ${firstName}</p>
      <div class="urgency-badge">⚡ Pre-Season 2025 ⚡</div>
    </div>

    <div class="content">
      <p class="greeting">Hey ${firstName}! 👋</p>

      <p class="intro-text">Your <strong>Tax Genius Pro</strong> preparer account is set up and waiting for you! Now is the <strong>perfect time</strong> to get started before tax season kicks off. Let's make this your biggest season yet! 💪</p>

      <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=150&fit=crop" alt="Money and Success" class="feature-image">

      <h2 class="section-title">🔥 Why Activate Now? 🔥</h2>

      <div class="feature-card">
        <h3><span class="emoji">💰</span> Pre-Tax Season Cash Advance Links Are LIVE</h3>
        <p>Your personalized links for the Cash Advance program are ready to share. Get them out <strong>NOW</strong> before the rush - clients are already looking for early refund options!</p>
      </div>

      <div class="feature-card">
        <h3><span class="emoji">📱</span> Google Integration = Easy Client Management</h3>
        <p>Login with your Google account to unlock:</p>
        <ul>
          <li>📁 A dedicated folder in your Gmail for all client documents</li>
          <li>📊 Google Sheets integration to track your clients and referrals</li>
          <li>🔄 Everything synced and organized automatically</li>
        </ul>
      </div>

      <div class="feature-card">
        <h3><span class="emoji">🔔</span> Real-Time Notifications</h3>
        <p>Download the app and turn on notifications to get instant alerts when:</p>
        <ul>
          <li>📝 A new client fills out an intake form</li>
          <li>🔗 Someone uses your referral link</li>
          <li>🎯 A lead comes in from your marketing</li>
        </ul>
      </div>

      <div class="feature-card">
        <h3><span class="emoji">📊</span> Track Your Marketing with QR Codes & Links</h3>
        <p>See exactly which flyers, posts, or locations are bringing in the most clients! Data-driven decisions = more money! 📈</p>
      </div>

      <div class="links-section">
        <h4>🔗 Your Personalized Links</h4>
        <p class="subtitle">Click any link to preview it!</p>

        <a href="https://taxgeniuspro.tax/go/${trackingCode}-cash" class="link-item">
          <span class="link-emoji">💵</span>
          <span class="link-label">Cash Advance</span>
          <span class="link-url">taxgeniuspro.tax/go/${trackingCode}-cash</span>
        </a>

        <a href="https://taxgeniuspro.tax/go/${trackingCode}-lead" class="link-item">
          <span class="link-emoji">🎯</span>
          <span class="link-label">Lead Capture</span>
          <span class="link-url">taxgeniuspro.tax/go/${trackingCode}-lead</span>
        </a>

        <a href="https://taxgeniuspro.tax/go/${trackingCode}-intake" class="link-item">
          <span class="link-emoji">📋</span>
          <span class="link-label">Intake Form</span>
          <span class="link-url">taxgeniuspro.tax/go/${trackingCode}-intake</span>
        </a>

        <a href="https://taxgeniuspro.tax/go/${trackingCode}-appt" class="link-item">
          <span class="link-emoji">📅</span>
          <span class="link-label">Appointments</span>
          <span class="link-url">taxgeniuspro.tax/go/${trackingCode}-appt</span>
        </a>
      </div>

      <div class="feature-card">
        <h3><span class="emoji">💎</span> Set Your Own Referral Tiers</h3>
        <p>You control your referral program! Set your own commission tiers and be as <strong>aggressive</strong> as you want to attract more referrals. The more you offer, the more people will send clients your way! 🚀</p>
      </div>

      <p class="more-features">✨ ...and so much more! ✨</p>

      <div class="divider"></div>

      <div class="steps-section">
        <h3>Get Started in 2 Minutes</h3>
        <div class="step">
          <span class="step-number">1</span>
          <span class="step-text">Go to <strong>taxgeniuspro.tax</strong></span>
        </div>
        <div class="step">
          <span class="step-number">2</span>
          <span class="step-text">Click <strong>"Login with Google"</strong></span>
        </div>
        <div class="step">
          <span class="step-number">3</span>
          <span class="step-text">Your account will <strong>automatically upgrade</strong> to Tax Preparer status</span>
        </div>
        <div class="step">
          <span class="step-number">4</span>
          <span class="step-text"><strong>Update your profile picture</strong> - it appears on all your forms and QR codes! 📸</span>
        </div>
      </div>

      <div class="cta-section">
        <a href="https://taxgeniuspro.tax" class="cta-button">🚀 LOGIN NOW 🚀</a>
        <p class="cta-subtext">🔒 Secure & takes only 60 seconds</p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-emoji">📞</div>
      <p class="footer-contact">Questions? Call Ira directly:</p>
      <a href="tel:4046682401" class="footer-phone">(404) 668-2401</a>
      <p class="footer-tagline">Let's make this tax season your BEST one yet! 🏆<span class="footer-brand">— The Tax Genius Pro Team 💚</span></p>
    </div>
  </div>
</body>
</html>
`;
}

async function sendAllEmails() {
  console.log('=== SENDING ACTIVATION EMAILS TO ALL 32 PREPARERS ===\n');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  const results: { email: string; name: string; success: boolean; id?: string; error?: string }[] = [];

  // Default avatar for preparers without images
  const defaultAvatar = 'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487892/taxgeniuspro/preparers/preparer_ow.png';

  for (const preparer of preparers) {
    const avatarUrl = `https://res.cloudinary.com/dhktmiigh/image/upload/v1765487892/taxgeniuspro/preparers/preparer_${preparer.code}.jpg`;

    process.stdout.write(`Sending to ${preparer.firstName} ${preparer.lastName} (${preparer.email})... `);

    try {
      const result = await resend.emails.send({
        from: 'Tax Genius Pro <noreply@taxgeniuspro.tax>',
        to: preparer.email,
        subject: `Your Tax Genius Pro Account is Ready - Activate Now for Pre-Tax Season!`,
        html: getEmailHtml(preparer.firstName, preparer.code, avatarUrl),
      });

      if (result.error) {
        console.log(`FAILED: ${result.error.message}`);
        results.push({ email: preparer.email, name: `${preparer.firstName} ${preparer.lastName}`, success: false, error: result.error.message });
      } else {
        console.log(`OK (${result.data?.id})`);
        results.push({ email: preparer.email, name: `${preparer.firstName} ${preparer.lastName}`, success: true, id: result.data?.id });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log(`FAILED: ${errorMsg}`);
      results.push({ email: preparer.email, name: `${preparer.firstName} ${preparer.lastName}`, success: false, error: errorMsg });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n=== FAILED EMAILS ===\n');
    failed.forEach(f => {
      console.log(`  - ${f.name} (${f.email}): ${f.error}`);
    });
  }

  console.log(`\nCompleted at: ${new Date().toLocaleString()}`);
}

sendAllEmails().catch(console.error);
