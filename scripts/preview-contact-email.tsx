import { render } from '@react-email/render';
import { ContactFormNotification } from '../emails/contact-form-notification';

async function previewEmail() {
  console.log('=== Rendering Contact Form Email Template ===\n');

  const props = {
    name: 'Test Client SW',
    email: 'test-sw@example.com',
    phone: '404-555-1234',
    service: 'business',
    message: 'This is a test message to verify the contact form is working correctly.',
    submittedAt: new Date(),
    locale: 'en' as const,
    recipientName: 'Sarah',
    referralCode: 'sw-lead',
    referralSource: 'taxgeniuspro.tax/go/sw-lead',
  };

  console.log('Props being passed to template:');
  console.log(JSON.stringify(props, null, 2));
  console.log('\n');

  try {
    // Render as HTML
    const html = await render(ContactFormNotification(props));

    console.log('=== HTML Output (first 3000 chars) ===\n');
    console.log(html.substring(0, 3000));
    console.log('\n...(truncated)\n');

    // Check if key elements are present
    console.log('=== Content Verification ===');
    console.log('Contains name "Test Client SW":', html.includes('Test Client SW'));
    console.log('Contains email "test-sw@example.com":', html.includes('test-sw@example.com'));
    console.log('Contains phone "404-555-1234":', html.includes('404-555-1234'));
    console.log('Contains service "Business":', html.includes('Business'));
    console.log('Contains message:', html.includes('test message to verify'));
    console.log('Contains referral code "sw-lead":', html.includes('sw-lead'));
    console.log('Contains marketing link:', html.includes('taxgeniuspro.tax/go/sw-lead'));
    console.log('Contains "Hello Sarah":', html.includes('Hello Sarah'));

  } catch (error) {
    console.error('Error rendering email:', error);
  }
}

previewEmail();
