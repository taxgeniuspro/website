/**
 * Test script: Send email with PDF attachment
 *
 * This tests the full flow of generating a PDF with embedded images
 * and sending it as an email attachment.
 *
 * Usage: npx tsx scripts/test-pdf-email.ts
 */

import { generateTaxIntakePDF } from "../src/lib/services/pdf-form-generator.service";
import { getResendClient } from "../src/lib/resend";

async function testEmailWithPDF() {
  console.log("Testing PDF attachment in email...\n");

  // Generate PDF with sample data
  console.log("Step 1: Generating PDF...");
  const pdfBuffer = await generateTaxIntakePDF({
    id: "test-email-" + Date.now(),
    first_name: "Test",
    middle_name: "PDF",
    last_name: "Attachment",
    email: "test@example.com",
    phone: "4045551234",
    address_line_1: "123 Test Street",
    city: "Atlanta",
    state: "GA",
    zip_code: "30301",
    filing_status: "single",
    employment_type: "w2_employee",
    occupation: "Software Developer",
    has_dependents: true,
    number_of_dependents: 2,
    has_mortgage: true,
    wants_refund_advance: true,
    denied_eitc: false,
    has_irs_pin: false,
    referrerUsername: "gw",
    referrerType: "tax_preparer",
    tax_year: 2024,
    created_at: new Date(),
    // Include a test image
    drivers_license_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  });

  console.log("  ✅ PDF generated:", pdfBuffer.length, "bytes");
  console.log("  📄 Expected pages: 2 (form + driver license image)\n");

  // Send email with PDF attachment
  console.log("Step 2: Sending email with PDF attachment...");
  const resend = getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@taxgeniuspro.tax",
      to: ["taxgenius.tax@gmail.com"], // Send to Owliver for testing
      subject: "🧪 TEST: PDF Attachment with Image - " + new Date().toLocaleString(),
      html: `
        <h2>Test Email - PDF Attachment Feature</h2>
        <p>This is a test email to verify that PDF forms are correctly attached to emails.</p>
        <h3>Test Details:</h3>
        <ul>
          <li><strong>PDF Size:</strong> ${pdfBuffer.length} bytes</li>
          <li><strong>Expected Pages:</strong> 2 (form data + driver license image)</li>
          <li><strong>Generated At:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>Please open the attached PDF to verify:</p>
        <ol>
          <li>Page 1: Tax intake form with all fields properly labeled</li>
          <li>Page 2: Driver's license image embedded</li>
          <li>Footer shows correct page numbers (1 of 2, 2 of 2)</li>
        </ol>
        <hr>
        <p style="color: gray; font-size: 12px;">
          This is an automated test from Tax Genius Pro PDF generation system.
        </p>
      `,
      attachments: [{
        filename: "TaxIntake_Attachment_TEST.pdf",
        content: pdfBuffer,
      }],
    });

    if (error) {
      console.log("  ❌ Email failed:", error);
    } else {
      console.log("  ✅ Email sent successfully!");
      console.log("  📧 Email ID:", data?.id);
      console.log("  📬 Sent to: taxgenius.tax@gmail.com");
      console.log("\n✅ Test complete! Check the inbox for the PDF attachment.");
    }
  } catch (err) {
    console.log("  ❌ Error:", err);
  }
}

testEmailWithPDF().catch(console.error);
