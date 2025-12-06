import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

// Initialize Resend only when needed to avoid build errors
const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract all form fields
    const taxFormData = {
      first_name: formData.get('first_name') as string,
      middle_name: formData.get('middle_name') as string || '',
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      country_code: formData.get('country_code') as string || '+1',
      address_line_1: formData.get('address_line_1') as string,
      address_line_2: formData.get('address_line_2') as string || '',
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip_code: formData.get('zip_code') as string,
      date_of_birth: formData.get('date_of_birth') as string,
      ssn: formData.get('ssn') as string,
      filing_status: formData.get('filing_status') as string,
      employment_type: formData.get('employment_type') as string,
      occupation: formData.get('occupation') as string,
      claimed_as_dependent: formData.get('claimed_as_dependent') as string,
      in_college: formData.get('in_college') as string,
      has_dependents: formData.get('has_dependents') as string,
      number_of_dependents: formData.get('number_of_dependents') as string || '',
      dependents_under_24_student_or_disabled: formData.get('dependents_under_24_student_or_disabled') as string || '',
      dependents_in_college: formData.get('dependents_in_college') as string || '',
      child_care_provider: formData.get('child_care_provider') as string || '',
      has_mortgage: formData.get('has_mortgage') as string,
      denied_eitc: formData.get('denied_eitc') as string,
      has_irs_pin: formData.get('has_irs_pin') as string,
      irs_pin: formData.get('irs_pin') as string || '',
      wants_refund_advance: formData.get('wants_refund_advance') as string,
      drivers_license: formData.get('drivers_license') as string,
      license_expiration: formData.get('license_expiration') as string,
    };

    const preparerCode = formData.get('preparer_code') as string;

    // Handle file upload
    const licenseFile = formData.get('license_file') as File | null;
    let uploadedFilePath: string | null = null;

    if (licenseFile) {
      const bytes = await licenseFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'tax-documents');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${licenseFile.name}`;
      const filePath = join(uploadDir, fileName);

      // Save file
      await writeFile(filePath, buffer);
      uploadedFilePath = `/uploads/tax-documents/${fileName}`;

      logger.info('File uploaded', { fileName, size: buffer.length });
    }

    // Find preparer by tracking code
    const preparer = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: preparerCode },
          { customTrackingCode: preparerCode },
        ],
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    // Generate comprehensive HTML email
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .section { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .section h2 { color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    td:first-child { font-weight: bold; width: 220px; color: #555; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button { background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 New Tax Return Submission</h1>
      <p>Client: ${taxFormData.first_name} ${taxFormData.last_name}</p>
    </div>

    <div class="alert">
      <strong>⚠️ Action Required:</strong> A new client has submitted their tax intake form using your referral code: <strong>${preparerCode}</strong>
    </div>

    <!-- PERSONAL INFORMATION -->
    <div class="section">
      <h2>👤 Personal Information</h2>
      <table>
        <tr><td>Full Name</td><td>${taxFormData.first_name} ${taxFormData.middle_name} ${taxFormData.last_name}</td></tr>
        <tr><td>Email</td><td><a href="mailto:${taxFormData.email}">${taxFormData.email}</a></td></tr>
        <tr><td>Phone</td><td><a href="tel:${taxFormData.phone}">${taxFormData.country_code} ${taxFormData.phone}</a></td></tr>
        <tr><td>Date of Birth</td><td>${taxFormData.date_of_birth}</td></tr>
        <tr><td>SSN</td><td>${taxFormData.ssn}</td></tr>
      </table>
    </div>

    <!-- ADDRESS -->
    <div class="section">
      <h2>📍 Address</h2>
      <table>
        <tr><td>Street Address</td><td>${taxFormData.address_line_1}</td></tr>
        ${taxFormData.address_line_2 ? `<tr><td>Address Line 2</td><td>${taxFormData.address_line_2}</td></tr>` : ''}
        <tr><td>City</td><td>${taxFormData.city}</td></tr>
        <tr><td>State</td><td>${taxFormData.state}</td></tr>
        <tr><td>ZIP Code</td><td>${taxFormData.zip_code}</td></tr>
      </table>
    </div>

    <!-- TAX FILING INFORMATION -->
    <div class="section">
      <h2>📋 Tax Filing Information</h2>
      <table>
        <tr><td>Filing Status</td><td>${taxFormData.filing_status}</td></tr>
        <tr><td>Employment Type</td><td>${taxFormData.employment_type}</td></tr>
        <tr><td>Occupation</td><td>${taxFormData.occupation}</td></tr>
        <tr><td>Claimed as Dependent</td><td>${taxFormData.claimed_as_dependent === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- EDUCATION -->
    <div class="section">
      <h2>🎓 Education</h2>
      <table>
        <tr><td>Currently in College</td><td>${taxFormData.in_college === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- DEPENDENTS -->
    <div class="section">
      <h2>👨‍👩‍👧‍👦 Dependents</h2>
      <table>
        <tr><td>Has Dependents</td><td>${taxFormData.has_dependents === 'yes' ? 'Yes' : 'None'}</td></tr>
        ${taxFormData.has_dependents === 'yes' ? `
          <tr><td>Number of Dependents</td><td>${taxFormData.number_of_dependents}</td></tr>
          <tr><td>Dependents Under 24 (Student/Disabled)</td><td>${taxFormData.dependents_under_24_student_or_disabled === 'yes' ? 'Yes' : 'No'}</td></tr>
          <tr><td>Dependents in College</td><td>${taxFormData.dependents_in_college === 'yes' ? 'Yes' : 'No'}</td></tr>
          <tr><td>Child Care Provider</td><td>${taxFormData.child_care_provider === 'yes' ? 'Yes' : 'No'}</td></tr>
        ` : ''}
      </table>
    </div>

    <!-- PROPERTY -->
    <div class="section">
      <h2>🏠 Property Information</h2>
      <table>
        <tr><td>Has Mortgage</td><td>${taxFormData.has_mortgage === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- TAX CREDITS -->
    <div class="section">
      <h2>💰 Tax Credits & IRS Information</h2>
      <table>
        <tr><td>Ever Denied EITC</td><td>${taxFormData.denied_eitc === 'yes' ? 'Yes' : 'No'}</td></tr>
        <tr><td>Has IRS PIN</td><td>${taxFormData.has_irs_pin}</td></tr>
        ${taxFormData.has_irs_pin === 'yes' ? `<tr><td>IRS PIN</td><td>${taxFormData.irs_pin}</td></tr>` : ''}
      </table>
    </div>

    <!-- REFUND OPTIONS -->
    <div class="section">
      <h2>💵 Refund Options</h2>
      <table>
        <tr><td>Wants Refund Advance</td><td>${taxFormData.wants_refund_advance === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- IDENTIFICATION -->
    <div class="section">
      <h2>🪪 Identification Documents</h2>
      <table>
        <tr><td>Driver's License #</td><td>${taxFormData.drivers_license}</td></tr>
        <tr><td>License Expiration</td><td>${taxFormData.license_expiration}</td></tr>
        <tr><td>Uploaded Files</td><td>${uploadedFilePath ? 'Driver\'s License attached' : 'No files uploaded yet'}</td></tr>
      </table>
    </div>

    <!-- NEXT STEPS -->
    <div class="section" style="background: #E0F2FE;">
      <h2>📝 Next Steps</h2>
      <ol>
        <li>Review all client information above</li>
        <li>Contact client at <a href="mailto:${taxFormData.email}">${taxFormData.email}</a> or <a href="tel:${taxFormData.phone}">${taxFormData.phone}</a></li>
        <li>Request any missing documents</li>
        <li>Begin tax preparation</li>
        <li>Upload completed return to dashboard</li>
      </ol>
      <p><a href="https://taxgeniuspro.tax/en/dashboard/tax-preparer" class="cta-button">View Dashboard →</a></p>
    </div>

    <div class="footer">
      <p><strong>Tax Genius Pro</strong></p>
      <p>Preparer: ${preparer.firstName} ${preparer.lastName} (Code: ${preparerCode})</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Plain text version
    const textEmail = `
NEW TAX RETURN SUBMISSION

Client: ${taxFormData.first_name} ${taxFormData.last_name}
Referral Code Used: ${preparerCode}

PERSONAL INFORMATION
--------------------
Full Name: ${taxFormData.first_name} ${taxFormData.middle_name} ${taxFormData.last_name}
Email: ${taxFormData.email}
Phone: ${taxFormData.country_code} ${taxFormData.phone}
Date of Birth: ${taxFormData.date_of_birth}
SSN: ${taxFormData.ssn}

ADDRESS
-------
${taxFormData.address_line_1}
${taxFormData.address_line_2 || ''}
${taxFormData.city}, ${taxFormData.state} ${taxFormData.zip_code}

TAX FILING INFORMATION
----------------------
Filing Status: ${taxFormData.filing_status}
Employment Type: ${taxFormData.employment_type}
Occupation: ${taxFormData.occupation}
Claimed as Dependent: ${taxFormData.claimed_as_dependent === 'yes' ? 'Yes' : 'No'}

EDUCATION
---------
Currently in College: ${taxFormData.in_college === 'yes' ? 'Yes' : 'No'}

DEPENDENTS
----------
Has Dependents: ${taxFormData.has_dependents === 'yes' ? 'Yes' : 'None'}
${taxFormData.has_dependents === 'yes' ? `Number of Dependents: ${taxFormData.number_of_dependents}
Dependents Under 24 (Student/Disabled): ${taxFormData.dependents_under_24_student_or_disabled === 'yes' ? 'Yes' : 'No'}
Dependents in College: ${taxFormData.dependents_in_college === 'yes' ? 'Yes' : 'No'}
Child Care Provider: ${taxFormData.child_care_provider === 'yes' ? 'Yes' : 'No'}` : ''}

PROPERTY
--------
Has Mortgage: ${taxFormData.has_mortgage === 'yes' ? 'Yes' : 'No'}

TAX CREDITS & IRS
-----------------
Ever Denied EITC: ${taxFormData.denied_eitc === 'yes' ? 'Yes' : 'No'}
Has IRS PIN: ${taxFormData.has_irs_pin}
${taxFormData.has_irs_pin === 'yes' ? `IRS PIN: ${taxFormData.irs_pin}` : ''}

REFUND OPTIONS
--------------
Wants Refund Advance: ${taxFormData.wants_refund_advance === 'yes' ? 'Yes' : 'No'}

IDENTIFICATION
--------------
Driver's License #: ${taxFormData.drivers_license}
License Expiration: ${taxFormData.license_expiration}
Uploaded Files: ${uploadedFilePath ? 'Driver\'s License attached' : 'No files uploaded yet'}

NEXT STEPS
----------
1. Review all client information above
2. Contact client at ${taxFormData.email} or ${taxFormData.phone}
3. Request any missing documents
4. Begin tax preparation
5. Upload completed return to dashboard

View Dashboard: https://taxgeniuspro.tax/en/dashboard/tax-preparer

---
Tax Genius Pro
Preparer: ${preparer.firstName} ${preparer.lastName} (Code: ${preparerCode})
    `;

    // Prepare email attachments
    const attachments: any[] = [];
    if (uploadedFilePath && licenseFile) {
      const fullPath = join(process.cwd(), 'public', uploadedFilePath);
      if (existsSync(fullPath)) {
        const fileBuffer = await readFile(fullPath);
        attachments.push({
          filename: licenseFile.name,
          content: fileBuffer,
        });
      }
    }

    // Send email via Resend
    const resend = getResend();
    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax',
      to: [preparer.user.email],
      subject: `New Tax Return Submission - ${taxFormData.first_name} ${taxFormData.last_name}`,
      html: htmlEmail,
      text: textEmail,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    logger.info('Tax form submitted, email sent', {
      emailId: emailResult.id,
      preparer: preparer.firstName,
      client: `${taxFormData.first_name} ${taxFormData.last_name}`,
      hasAttachment: attachments.length > 0,
    });

    return NextResponse.json({
      success: true,
      emailId: emailResult.id,
      message: 'Tax form submitted and preparer notified',
      fileUploaded: !!uploadedFilePath,
    });
  } catch (error) {
    logger.error('Error submitting tax form:', error);
    return NextResponse.json({ error: 'Failed to submit tax form' }, { status: 500 });
  }
}
