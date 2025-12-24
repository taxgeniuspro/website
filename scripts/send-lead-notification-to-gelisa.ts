import { Resend } from 'resend';

async function sendLeadNotification() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const leadInfo = {
    name: "Cazmyr Glenn",
    email: "cazmyrg95@gmail.com",
    phone: "8507409768"
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a5f2a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .lead-box { background: white; border: 2px solid #1a5f2a; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .lead-field { margin: 10px 0; }
    .label { font-weight: bold; color: #1a5f2a; }
    .value { font-size: 18px; }
    .cta-button { display: inline-block; background: #1a5f2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Lead Assigned!</h1>
    </div>
    <div class="content">
      <p>Hi Gelisa,</p>
      <p>A new lead has been assigned to you. Here are the details:</p>

      <div class="lead-box">
        <div class="lead-field">
          <span class="label">Name:</span>
          <div class="value">${leadInfo.name}</div>
        </div>
        <div class="lead-field">
          <span class="label">Email:</span>
          <div class="value"><a href="mailto:${leadInfo.email}">${leadInfo.email}</a></div>
        </div>
        <div class="lead-field">
          <span class="label">Phone:</span>
          <div class="value"><a href="tel:${leadInfo.phone}">${leadInfo.phone}</a></div>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="mailto:${leadInfo.email}" class="cta-button">Email Lead</a>
        <a href="tel:${leadInfo.phone}" class="cta-button">Call Lead</a>
      </p>

      <p>Please reach out to this lead as soon as possible to discuss their tax preparation needs.</p>

      <div class="footer">
        <p>Tax Genius Pro - Lead Management System</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  const { data, error } = await resend.emails.send({
    from: 'Tax Genius Pro <hello@taxgeniuspro.tax>',
    to: 'whitegelisa@gmail.com',
    subject: 'New Lead Assigned: Cazmyr Glenn',
    html: html,
  });

  if (error) {
    console.error('Error sending email:', error);
    return;
  }

  console.log('Email sent successfully to Gelisa White!');
  console.log('Email ID:', data?.id);
}

sendLeadNotification();
