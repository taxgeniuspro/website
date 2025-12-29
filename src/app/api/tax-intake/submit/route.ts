import { NextRequest, NextResponse } from 'next/server';
import { Resend } from '@/lib/resend';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';
import { DiskStorageService } from '@/lib/services/disk-storage.service';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';
import { generateTaxIntakePDF } from '@/lib/services/pdf-form-generator.service';
import { CRMService } from '@/lib/services/crm.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

// TypeScript interfaces for database types (replacing @prisma/client imports)
type ContactType = 'LEAD' | 'CLIENT' | 'PROSPECT' | 'PARTNER';
type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  trackingCode: string | null;
  customTrackingCode: string | null;
  user: {
    email: string;
    name: string | null;
  };
}

interface TaxIntakeLead {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string;
  tax_year: number;
  clientFolderId: string | null;
  full_form_data: Record<string, unknown> | null;
}

interface CRMContact {
  id: string;
  email: string;
  stage: PipelineStage;
  assignedPreparerId: string | null;
  referrerUsername: string | null;
  referrerType: string | null;
  attributionMethod: string | null;
}

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

    // Get tax year from form or use current filing year
    const providedTaxYear = formData.get('tax_year') as string | null;
    const tax_year = providedTaxYear ? parseInt(providedTaxYear) : getCurrentFilingTaxYear();

    // Find preparer by tracking code first (needed for folder creation)
    const { data: preparerResults } = await db
      .from('profiles')
      .select('id, firstName, lastName, role, trackingCode, customTrackingCode, users!inner(email, name)')
      .or(`trackingCode.eq.${preparerCode},customTrackingCode.eq.${preparerCode}`)
      .limit(1);

    const preparerRow = firstOrNull(preparerResults);
    if (!preparerRow) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    // Map Supabase result to expected Profile interface
    const preparer: Profile = {
      id: preparerRow.id,
      firstName: preparerRow.firstName,
      lastName: preparerRow.lastName,
      role: preparerRow.role,
      trackingCode: preparerRow.trackingCode,
      customTrackingCode: preparerRow.customTrackingCode,
      user: {
        email: (preparerRow.users as { email: string; name: string | null }).email,
        name: (preparerRow.users as { email: string; name: string | null }).name,
      },
    };

    // Handle file upload to Cloudinary
    const licenseFile = formData.get('license_file') as File | null;
    let uploadedFileUrl: string | null = null;
    let documentRecord: { id: string } | null = null;
    let fileBuffer: Buffer | null = null;
    let uploadError: string | null = null;

    logger.info('Checking for license file', {
      hasFile: !!licenseFile,
      fileType: licenseFile ? typeof licenseFile : 'none',
      fileName: licenseFile?.name,
      fileSize: licenseFile?.size,
      isFile: licenseFile instanceof File,
      isBlob: licenseFile instanceof Blob,
    });

    if (licenseFile && licenseFile.size > 0) {
      const bytes = await licenseFile.arrayBuffer();
      fileBuffer = Buffer.from(bytes);

      try {
        // Get or create client folder structure using tax year
        const folderResult = await ClientFolderService.getOrCreateClientFolder(
          preparer.id,
          taxFormData.first_name,
          taxFormData.last_name,
          tax_year
        );

        // Generate storage key for disk storage
        const key = DiskStorageService.generateKey(preparer.id, licenseFile.name, 'documents');

        // Upload to disk storage (encrypted for sensitive documents)
        const uploadResult = await DiskStorageService.uploadFile(
          key,
          fileBuffer,
          licenseFile.type || 'image/jpeg',
          {
            encrypt: true, // Sensitive client documents
            generateThumbnail: licenseFile.type?.startsWith('image/'),
          }
        );

        uploadedFileUrl = uploadResult.url;

        logger.info('Document uploaded to disk storage', {
          fileName: licenseFile.name,
          storageUrl: uploadedFileUrl,
          storageKey: key,
          size: fileBuffer.length,
        });

        // Create Document record in database for tracking
        const { data: docRecord, error: docError } = await db
          .from('documents')
          .insert({
            profileId: preparer.id,
            type: 'OTHER', // Driver's license - use OTHER as ID_DOCUMENT doesn't exist in enum
            fileName: licenseFile.name,
            fileUrl: uploadedFileUrl,
            fileSize: fileBuffer.length,
            mimeType: licenseFile.type || 'application/octet-stream',
            taxYear: tax_year,
            status: 'PENDING',
            folderId: folderResult.yearFolderId,
            metadata: {
              clientEmail: taxFormData.email,
              clientName: `${taxFormData.first_name} ${taxFormData.last_name}`,
              uploadedVia: 'tax_intake_form',
              documentCategory: 'ID-Documents',
              documentType: 'drivers_license',
              storageKey: key,
            },
          })
          .select('id')
          .single();

        if (docError) throw docError;
        documentRecord = docRecord;

        logger.info('Document record created', {
          documentId: documentRecord.id,
          folderId: folderResult.yearFolderId,
          fileUrl: uploadedFileUrl,
        });

        // Also update the lead with the folder ID if it exists (using composite key)
        const { data: existingLeadResults } = await db
          .from('tax_intake_leads')
          .select('id, clientFolderId')
          .eq('email', taxFormData.email)
          .eq('tax_year', tax_year)
          .limit(1);

        const existingLead = firstOrNull(existingLeadResults);

        if (existingLead && !existingLead.clientFolderId) {
          await db
            .from('tax_intake_leads')
            .update({ clientFolderId: folderResult.folderId })
            .eq('id', existingLead.id);
        }
      } catch (err: unknown) {
        const errObj = err as Error;
        uploadError = errObj?.message || String(err);
        logger.error('Disk storage upload failed', {
          error: uploadError,
          stack: errObj?.stack,
        });
        // Continue without file - don't fail the whole submission
      }
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
    .document-preview { margin: 20px 0; text-align: center; }
    .document-preview img { max-width: 400px; max-height: 300px; border: 2px solid #ddd; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Tax Return Submission</h1>
      <p>Client: ${taxFormData.first_name} ${taxFormData.last_name}</p>
    </div>

    <div class="alert">
      <strong>Action Required:</strong> A new client has submitted their tax intake form using your referral code: <strong>${preparerCode}</strong>
    </div>

    <!-- PERSONAL INFORMATION -->
    <div class="section">
      <h2>Personal Information</h2>
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
      <h2>Address</h2>
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
      <h2>Tax Filing Information</h2>
      <table>
        <tr><td>Filing Status</td><td>${taxFormData.filing_status}</td></tr>
        <tr><td>Employment Type</td><td>${taxFormData.employment_type}</td></tr>
        <tr><td>Occupation</td><td>${taxFormData.occupation}</td></tr>
        <tr><td>Claimed as Dependent</td><td>${taxFormData.claimed_as_dependent === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- EDUCATION -->
    <div class="section">
      <h2>Education</h2>
      <table>
        <tr><td>Currently in College</td><td>${taxFormData.in_college === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- DEPENDENTS -->
    <div class="section">
      <h2>Dependents</h2>
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
      <h2>Property Information</h2>
      <table>
        <tr><td>Has Mortgage</td><td>${taxFormData.has_mortgage === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- TAX CREDITS -->
    <div class="section">
      <h2>Tax Credits & IRS Information</h2>
      <table>
        <tr><td>Ever Denied EITC</td><td>${taxFormData.denied_eitc === 'yes' ? 'Yes' : 'No'}</td></tr>
        <tr><td>Has IRS PIN</td><td>${taxFormData.has_irs_pin}</td></tr>
        ${taxFormData.has_irs_pin === 'yes' ? `<tr><td>IRS PIN</td><td>${taxFormData.irs_pin}</td></tr>` : ''}
      </table>
    </div>

    <!-- REFUND OPTIONS -->
    <div class="section">
      <h2>Refund Options</h2>
      <table>
        <tr><td>Wants Refund Advance</td><td>${taxFormData.wants_refund_advance === 'yes' ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <!-- IDENTIFICATION -->
    <div class="section">
      <h2>Identification Documents</h2>
      <table>
        <tr><td>Driver's License #</td><td>${taxFormData.drivers_license}</td></tr>
        <tr><td>License Expiration</td><td>${taxFormData.license_expiration}</td></tr>
        <tr><td>Document Uploaded</td><td>${uploadedFileUrl ? 'Yes - Driver\'s License attached below and in email' : 'No files uploaded'}</td></tr>
      </table>
      ${uploadedFileUrl ? `
        <div class="document-preview">
          <p><strong>Driver's License Preview:</strong></p>
          <img src="${uploadedFileUrl}" alt="Driver's License" />
          <p><a href="${uploadedFileUrl}" target="_blank">View Full Size</a></p>
        </div>
      ` : ''}
    </div>

    <!-- NEXT STEPS -->
    <div class="section" style="background: #E0F2FE;">
      <h2>Next Steps</h2>
      <ol>
        <li>Review all client information above</li>
        <li>Contact client at <a href="mailto:${taxFormData.email}">${taxFormData.email}</a> or <a href="tel:${taxFormData.phone}">${taxFormData.phone}</a></li>
        <li>Request any missing documents</li>
        <li>Begin tax preparation</li>
        <li>Upload completed return to dashboard</li>
      </ol>
      <p><a href="https://taxgeniuspro.tax/en/dashboard/tax-preparer" class="cta-button">View Dashboard</a></p>
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
Document Uploaded: ${uploadedFileUrl ? 'Yes - See attachment' : 'No files uploaded'}
${uploadedFileUrl ? `Document URL: ${uploadedFileUrl}` : ''}

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

    // Generate PDF with all form data
    let pdfBuffer: Buffer | null = null;
    try {
      // Generate PDF using the PDF service
      // Need to find or create a lead ID for the PDF
      const { data: pdfLeadResults } = await db
        .from('tax_intake_leads')
        .select('id')
        .eq('email', taxFormData.email.toLowerCase())
        .eq('tax_year', tax_year)
        .limit(1);

      const existingLeadForPdf = firstOrNull(pdfLeadResults);

      const pdfData = {
        id: existingLeadForPdf?.id || 'new-submission',
        ...taxFormData,
        // Map form data to PDF interface
        date_of_birth: taxFormData.date_of_birth,
        ssn: taxFormData.ssn,
        filing_status: taxFormData.filing_status,
        employment_type: taxFormData.employment_type,
        occupation: taxFormData.occupation,
        claimed_as_dependent: taxFormData.claimed_as_dependent,
        in_college: taxFormData.in_college,
        has_dependents: taxFormData.has_dependents,
        number_of_dependents: taxFormData.number_of_dependents,
        dependents_under_24_student_or_disabled: taxFormData.dependents_under_24_student_or_disabled,
        dependents_in_college: taxFormData.dependents_in_college,
        child_care_provider: taxFormData.child_care_provider,
        has_mortgage: taxFormData.has_mortgage,
        wants_refund_advance: taxFormData.wants_refund_advance,
        denied_eitc: taxFormData.denied_eitc,
        has_irs_pin: taxFormData.has_irs_pin,
        irs_pin: taxFormData.irs_pin,
        drivers_license: taxFormData.drivers_license,
        license_expiration: taxFormData.license_expiration,
        // Include driver's license image URL for PDF if available
        drivers_license_url: uploadedFileUrl,
        // Required for PDF footer
        created_at: new Date(),
      };

      pdfBuffer = await generateTaxIntakePDF(pdfData);
      logger.info('PDF generated successfully', {
        size: pdfBuffer.length,
        client: `${taxFormData.first_name} ${taxFormData.last_name}`,
      });
    } catch (pdfError) {
      logger.error('PDF generation failed', {
        error: pdfError,
        errorMessage: pdfError instanceof Error ? pdfError.message : 'Unknown error',
        errorStack: pdfError instanceof Error ? pdfError.stack : undefined,
        hasDriversLicenseUrl: !!uploadedFileUrl,
      });
      // Continue without PDF - don't fail the whole submission
    }

    // Prepare email attachments - attach from buffer directly (no filesystem)
    const attachments: Array<{ filename: string; content: Buffer }> = [];

    // Add PDF attachment first
    if (pdfBuffer) {
      const pdfFilename = `Tax-Intake-${taxFormData.last_name}-${taxFormData.first_name}-${tax_year}.pdf`;
      attachments.push({
        filename: pdfFilename,
        content: pdfBuffer,
      });
      logger.info('Adding PDF attachment to email', {
        filename: pdfFilename,
        size: pdfBuffer.length,
      });
    }

    // Add driver's license image attachment
    if (fileBuffer && licenseFile) {
      attachments.push({
        filename: licenseFile.name,
        content: fileBuffer,
      });
      logger.info('Adding file attachment to email', {
        filename: licenseFile.name,
        size: fileBuffer.length,
      });
    }

    // Send email via Resend
    // MANDATORY: All intake forms must be sent to the tax preparer AND BCC to taxgenius.tax@gmail.com
    const resend = getResend();
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax',
      to: [preparer.user.email],
      bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
      subject: `New Tax Return Submission - ${taxFormData.first_name} ${taxFormData.last_name}`,
      html: htmlEmail,
      text: textEmail,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (emailError) {
      logger.error('Failed to send email', { error: emailError });
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    logger.info('Tax form submitted, email sent', {
      emailId: emailResult?.id,
      preparer: preparer.firstName,
      client: `${taxFormData.first_name} ${taxFormData.last_name}`,
      hasAttachment: attachments.length > 0,
      cloudinaryUrl: uploadedFileUrl,
    });

    // CRITICAL FIX: Update TaxIntakeLead with COMPLETE form data
    // The lead was created at page 2/3 with basic info only.
    // Now we update it with ALL tax data (SSN, DOB, filing_status, etc.)
    try {
      const { data: existingLeadResults } = await db
        .from('tax_intake_leads')
        .select('id, full_form_data')
        .eq('email', taxFormData.email.toLowerCase())
        .eq('tax_year', tax_year)
        .limit(1);

      const existingLead = firstOrNull(existingLeadResults) as TaxIntakeLead | null;

      if (existingLead) {
        // Merge existing full_form_data with new complete data
        const existingFormData = (existingLead.full_form_data as Record<string, unknown>) || {};

        await db
          .from('tax_intake_leads')
          .update({
            // Mark as complete - this is a FULL intake form with SSN, DOB, filing_status
            completed: true,
            // Update full_form_data with ALL fields including sensitive tax data
            full_form_data: {
              ...existingFormData,
              ...taxFormData,
              // Store driver's license image URL for display in dashboard/CRM
              drivers_license_image_url: uploadedFileUrl,
              // Mark submission timestamp
              submitted_at: new Date().toISOString(),
            },
          })
          .eq('id', existingLead.id);

        logger.info('TaxIntakeLead updated with complete form data', {
          leadId: existingLead.id,
          email: taxFormData.email,
          completed: true,
          hasSSN: !!taxFormData.ssn,
          hasDOB: !!taxFormData.date_of_birth,
          hasFilingStatus: !!taxFormData.filing_status,
          hasDriversLicenseImage: !!uploadedFileUrl,
        });
      } else {
        // Lead doesn't exist yet - create it with complete data
        // This can happen if user skipped the intermediate save
        const { data: newLead, error: createError } = await db
          .from('tax_intake_leads')
          .insert({
            first_name: taxFormData.first_name,
            middle_name: taxFormData.middle_name || null,
            last_name: taxFormData.last_name,
            email: taxFormData.email.toLowerCase(),
            phone: taxFormData.phone,
            country_code: taxFormData.country_code || '+1',
            address_line_1: taxFormData.address_line_1,
            address_line_2: taxFormData.address_line_2 || null,
            city: taxFormData.city,
            state: taxFormData.state,
            zip_code: taxFormData.zip_code,
            tax_year: tax_year,
            completed: true,
            assignedPreparerId: preparer.id,
            referrerUsername: preparerCode,
            referrerType: 'TAX_PREPARER',
            attributionMethod: 'ref_param',
            full_form_data: {
              ...taxFormData,
              drivers_license_image_url: uploadedFileUrl,
              submitted_at: new Date().toISOString(),
            },
          })
          .select('id')
          .single();

        if (createError) throw createError;

        logger.info('TaxIntakeLead created with complete form data', {
          leadId: newLead?.id,
          email: taxFormData.email,
          assignedPreparerId: preparer.id,
        });
      }
    } catch (leadUpdateError) {
      // Log error but don't fail the response - email was already sent
      logger.error('Failed to update TaxIntakeLead with complete data', {
        error: leadUpdateError,
        email: taxFormData.email,
        tax_year: tax_year,
      });
    }

    // Create or update CRM contact for visibility in CRM system
    let crmContactId: string | null = null;
    try {
      // Check if CRM contact already exists for this email
      const { data: existingContactResults } = await db
        .from('crm_contacts')
        .select('id, stage, assignedPreparerId, referrerUsername, referrerType, attributionMethod')
        .eq('email', taxFormData.email.toLowerCase())
        .limit(1);

      const existingContact = firstOrNull(existingContactResults) as CRMContact | null;

      if (existingContact) {
        // Update existing contact with latest data
        await db
          .from('crm_contacts')
          .update({
            firstName: taxFormData.first_name,
            lastName: taxFormData.last_name,
            phone: taxFormData.phone,
            filingStatus: taxFormData.filing_status,
            taxYear: tax_year,
            // Don't change stage if already past NEW
            stage: existingContact.stage === 'NEW' ? 'NEW' : existingContact.stage,
            // Update preparer assignment if not already assigned
            assignedPreparerId: existingContact.assignedPreparerId || preparer.id,
            // Update referrer info if provided and not already set
            referrerUsername: existingContact.referrerUsername || preparerCode,
            referrerType: existingContact.referrerType || 'TAX_PREPARER',
            attributionMethod: existingContact.attributionMethod || 'ref_param',
            lastContactedAt: new Date().toISOString(),
          })
          .eq('id', existingContact.id);

        crmContactId = existingContact.id;
        logger.info('CRM contact updated', {
          contactId: existingContact.id,
          email: taxFormData.email,
        });
      } else {
        // Create new CRM contact
        const newContact = await CRMService.createContact({
          contactType: 'CLIENT' as ContactType,
          firstName: taxFormData.first_name,
          lastName: taxFormData.last_name,
          email: taxFormData.email.toLowerCase(),
          phone: taxFormData.phone,
          filingStatus: taxFormData.filing_status,
          taxYear: tax_year,
          source: 'tax_intake_form',
          assignedPreparerId: preparer.id,
          referrerUsername: preparerCode,
          referrerType: 'TAX_PREPARER',
          attributionMethod: 'ref_param',
        });
        crmContactId = newContact.id;
        logger.info('CRM contact created', {
          contactId: newContact.id,
          email: taxFormData.email,
          assignedPreparerId: preparer.id,
        });
      }
    } catch (crmError) {
      // Log error but don't fail the response - email and lead were already processed
      logger.error('Failed to create/update CRM contact', {
        error: crmError,
        email: taxFormData.email,
      });
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: '📋 TAX INTAKE (Complete Form)',
      firstName: taxFormData.first_name,
      lastName: taxFormData.last_name,
      email: taxFormData.email,
      phone: taxFormData.phone,
      zipCode: taxFormData.zip_code,
      refCode: preparerCode,
      assignedPreparer: `${preparer.firstName} ${preparer.lastName}`,
      source: 'tax_intake_form',
      additionalFields: {
        'Filing Status': taxFormData.filing_status || 'Not provided',
        'Employment': taxFormData.employment_type || 'Not provided',
        'Dependents': taxFormData.has_dependents === 'yes' ? (taxFormData.number_of_dependents || '1+') : '0',
        'Wants Advance': taxFormData.wants_refund_advance === 'yes' ? 'Yes' : 'No',
        'Has ID Upload': uploadedFileUrl ? 'Yes' : 'No',
      },
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

    return NextResponse.json({
      success: true,
      emailId: emailResult?.id,
      message: 'Tax form submitted and preparer notified',
      fileUploaded: !!uploadedFileUrl,
      documentId: documentRecord?.id,
      crmContactId: crmContactId,
      hasPdfAttachment: !!pdfBuffer,
    });
  } catch (error) {
    logger.error('Error submitting tax form:', error);
    return NextResponse.json({ error: 'Failed to submit tax form' }, { status: 500 });
  }
}
