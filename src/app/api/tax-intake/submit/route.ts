import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

// Lazy initialize Cloudinary to avoid build errors
const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  });
  return cloudinary;
};

// Initialize Resend only when needed to avoid build errors
const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// Upload buffer to Cloudinary
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string
): Promise<UploadApiResponse> {
  const cloud = getCloudinary();

  // Sanitize filename for public_id - remove extension and special chars
  const sanitizedName = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with hyphen
    .toLowerCase();

  return new Promise((resolve, reject) => {
    const uploadStream = cloud.uploader.upload_stream(
      {
        folder: `taxgeniuspro/client-documents/${folderPath}`,
        public_id: sanitizedName,
        resource_type: mimeType.startsWith('image/') ? 'image' : 'auto',
        // Don't specify format - let Cloudinary determine from the file
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('No result from Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

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
      const timestamp = Date.now();

      try {
        // Get or create client folder structure using tax year
        const folderResult = await ClientFolderService.getOrCreateClientFolder(
          preparer.id,
          taxFormData.first_name,
          taxFormData.last_name,
          tax_year
        );

        // Generate descriptive filename
        const sanitizedLastName = taxFormData.last_name.replace(/[^a-zA-Z0-9]/g, '');
        const sanitizedFirstName = taxFormData.first_name.replace(/[^a-zA-Z0-9]/g, '');
        const fileExtension = licenseFile.name.split('.').pop() || 'jpg';
        const cloudinaryFileName = `${sanitizedLastName}-${sanitizedFirstName}-DL-${timestamp}`;
        const folderPath = `${preparer.id}/${tax_year}`;

        // Upload to Cloudinary instead of local filesystem
        const cloudinaryResult = await uploadToCloudinary(
          fileBuffer,
          cloudinaryFileName,
          licenseFile.type || 'image/jpeg',
          folderPath
        );

        uploadedFileUrl = cloudinaryResult.secure_url;

        logger.info('Document uploaded to Cloudinary', {
          fileName: cloudinaryFileName,
          cloudinaryUrl: uploadedFileUrl,
          publicId: cloudinaryResult.public_id,
          size: fileBuffer.length,
        });

        // Create Document record in database for tracking
        documentRecord = await prisma.document.create({
          data: {
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
              cloudinaryPublicId: cloudinaryResult.public_id,
            },
          },
        });

        logger.info('Document record created', {
          documentId: documentRecord.id,
          folderId: folderResult.yearFolderId,
          fileUrl: uploadedFileUrl,
        });

        // Also update the lead with the folder ID if it exists (using composite key)
        const existingLead = await prisma.taxIntakeLead.findUnique({
          where: {
            email_tax_year: {
              email: taxFormData.email,
              tax_year: tax_year,
            },
          },
        });

        if (existingLead && !existingLead.clientFolderId) {
          await prisma.taxIntakeLead.update({
            where: { id: existingLead.id },
            data: { clientFolderId: folderResult.folderId },
          });
        }
      } catch (err: any) {
        uploadError = err?.message || String(err);
        logger.error('Cloudinary upload failed', {
          error: uploadError,
          stack: err?.stack,
          cloudinaryConfig: {
            hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
            hasApiKey: !!process.env.CLOUDINARY_API_KEY,
            hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
          },
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

    // Prepare email attachments - attach from buffer directly (no filesystem)
    const attachments: Array<{ filename: string; content: Buffer }> = [];
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
      cloudinaryUrl: uploadedFileUrl,
    });

    // CRITICAL FIX: Update TaxIntakeLead with COMPLETE form data
    // The lead was created at page 2/3 with basic info only.
    // Now we update it with ALL tax data (SSN, DOB, filing_status, etc.)
    try {
      const existingLead = await prisma.taxIntakeLead.findUnique({
        where: {
          email_tax_year: {
            email: taxFormData.email.toLowerCase(),
            tax_year: tax_year,
          },
        },
      });

      if (existingLead) {
        // Merge existing full_form_data with new complete data
        const existingFormData = (existingLead.full_form_data as Record<string, unknown>) || {};

        await prisma.taxIntakeLead.update({
          where: { id: existingLead.id },
          data: {
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
          },
        });

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
        const newLead = await prisma.taxIntakeLead.create({
          data: {
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
          },
        });

        logger.info('TaxIntakeLead created with complete form data', {
          leadId: newLead.id,
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

    return NextResponse.json({
      success: true,
      emailId: emailResult.id,
      message: 'Tax form submitted and preparer notified',
      fileUploaded: !!uploadedFileUrl,
      documentId: documentRecord?.id,
    });
  } catch (error) {
    logger.error('Error submitting tax form:', error);
    return NextResponse.json({ error: 'Failed to submit tax form' }, { status: 500 });
  }
}
