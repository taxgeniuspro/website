import { Resend } from 'resend';

async function sendSimpleTest() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log('📧 Sending simple test email to iradawatkins@gmail.com...\n');

  const uniqueId = 'TAXGENIUS-' + Date.now();

  const result = await resend.emails.send({
    from: 'noreply@taxgeniuspro.tax',
    to: 'iradwatkins@gmail.com',
    subject: '🔔 URGENT TEST ' + uniqueId,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ff6b35;">🎉 Tax Genius Pro Email Test</h1>
        <p style="font-size: 18px; color: #333;">
          <strong>Hello!</strong> This is a test email from your Tax Genius Pro platform.
        </p>
        <p style="font-size: 16px; color: #333;">
          If you're seeing this email, your email system is working perfectly! ✅
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.8;">
            <strong>From:</strong> noreply@taxgeniuspro.tax<br>
            <strong>To:</strong> iradawatkins@gmail.com<br>
            <strong>Subject:</strong> TEST EMAIL from Tax Genius Pro<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}
          </p>
        </div>
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          This is a test email for Epic 3 email system verification.
        </p>
      </div>
    `
  });

  if (result.error) {
    console.log('❌ ERROR:', result.error);
  } else {
    console.log('✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('Email ID:', result.data.id);
    console.log('\n📬 SEARCH YOUR GMAIL FOR: ' + uniqueId);
    console.log('   Subject starts with: "🔔 URGENT TEST"');
    console.log('   From: noreply@taxgeniuspro.tax');
    console.log('\n⚠️  Search in ALL FOLDERS (including Spam)!');
  }
}

sendSimpleTest();
