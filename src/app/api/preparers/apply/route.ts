import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { PreparerApplicationConfirmation } from '../../../../../emails/preparer-application-confirmation';
import { PreparerApplicationNotification } from '../../../../../emails/preparer-application-notification';
import { getEmailRecipients } from '@/config/email-routing';
import { generatePreparerApplicationPDF } from '@/lib/services/pdf-form-generator.service';

// TypeScript interfaces
interface PreparerApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  interviewDate: string | null;
  createdAt: string;
}

// POST /api/preparers/apply - Submit tax preparer application
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      languages,
      smsConsent,
      experienceLevel,
      taxSoftware,
      locale, // Language/Locale for email routing
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !languages || smsConsent !== 'yes') {
      return NextResponse.json(
        { error: 'Missing required fields or SMS consent not provided' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate experience level if provided
    if (experienceLevel) {
      const validLevels = ['NEW', 'INTERMEDIATE', 'SEASONED'];
      if (!validLevels.includes(experienceLevel)) {
        return NextResponse.json(
          { error: `Invalid experience level. Must be one of: ${validLevels.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create preparer application (allow multiple submissions)
    const { data: applicationData, error: applicationError } = await db
      .from('preparer_applications')
      .insert({
        firstName,
        middleName: middleName || null,
        lastName,
        email: email.toLowerCase(),
        phone,
        languages,
        smsConsent: smsConsent === 'yes',
        experienceLevel: experienceLevel || null,
        taxSoftware: taxSoftware || [],
        status: 'PENDING',
      })
      .select()
      .single();

    if (applicationError) {
      throw applicationError;
    }

    const application = applicationData;

    logger.info('Preparer application created', {
      applicationId: application.id,
      email: application.email,
      experienceLevel: application.experienceLevel,
    });

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    try {
      // Check if CRM contact exists
      const { data: existingContact } = await db
        .from('crm_contacts')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

      let crmContact;
      if (existingContact && existingContact.length > 0) {
        // Update existing contact
        const { data: updatedContact } = await db
          .from('crm_contacts')
          .update({
            firstName,
            lastName,
            phone,
            lastContactedAt: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase())
          .select()
          .single();
        crmContact = updatedContact;
      } else {
        // Create new contact
        const { data: newContact } = await db
          .from('crm_contacts')
          .insert({
            contactType: 'PREPARER',
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            stage: 'NEW',
            source: 'preparer_application',
            lastContactedAt: new Date().toISOString(),
          })
          .select()
          .single();
        crmContact = newContact;
      }

      if (crmContact) {
        logger.info('CRM contact created/updated from preparer application', {
          contactId: crmContact.id,
          applicationId: application.id,
          email,
        });

        // Create CRMInteraction to log the application
        const softwareList = taxSoftware && Array.isArray(taxSoftware) && taxSoftware.length > 0
          ? taxSoftware.join(', ')
          : 'Not specified';

        await db
          .from('crm_interactions')
          .insert({
            contactId: crmContact.id,
            type: 'NOTE',
            direction: 'INBOUND',
            subject: '👔 Tax Preparer Application Submitted',
            body: `**Tax Preparer Application Received**

**Applicant Information:**
- Name: ${firstName} ${middleName ? middleName + ' ' : ''}${lastName}
- Email: ${email}
- Phone: ${phone}
- Languages: ${languages}

**Experience & Skills:**
- Experience Level: ${experienceLevel || 'Not specified'}
- Tax Software: ${softwareList}
- SMS Consent: ${smsConsent ? 'Yes' : 'No'}

**Application Status:** PENDING Review

**Application ID:** ${application.id}`,
            occurredAt: new Date().toISOString(),
          });

        logger.info('CRM interaction created for preparer application', {
          contactId: crmContact.id,
          applicationId: application.id,
        });

        // Link CRM contact to the application
        await db
          .from('preparer_applications')
          .update({ crmContactId: crmContact.id })
          .eq('id', application.id);
      }
    } catch (crmError) {
      // Log error but don't fail the request
      logger.error('Failed to create CRM contact/interaction', {
        error: crmError,
        applicationId: application.id,
        email,
      });
    }

    // Send emails
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Preparer application emails (Dev Mode)', {
          applicantEmail: email,
          hiringEmail: 'taxgenius.tax+hire@gmail.com',
          applicationId: application.id,
        });
      } else {
        // 1. Send confirmation email to applicant
        const { data: confirmData, error: confirmError } = await getResendClient().emails.send({
          from: fromEmail,
          to: email,
          subject: 'Application Received - TaxGeniusPro Tax Preparer Position',
          react: PreparerApplicationConfirmation({
            firstName,
            lastName,
            email,
            phone,
            experienceLevel,
            taxSoftware,
          }),
        });

        if (confirmError) {
          logger.error('Failed to send applicant confirmation email', confirmError);
        } else {
          logger.info('Applicant confirmation email sent', { emailId: confirmData?.id });
        }

        // 2. Send notification emails to hiring team
        // Language-based routing using centralized config:
        // Spanish → Goldenprotaxes@gmail.com (Ale Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
        // English → taxgenius.taxes@gmail.com (Ray Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
        const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

        logger.info('Preparer application language-based routing', {
          locale: locale || 'en',
          primaryRecipient: recipients.primary,
          ccRecipient: recipients.cc,
        });

        // Generate PDF attachment with all form data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generatePreparerApplicationPDF({
            id: application.id,
            firstName,
            lastName,
            middleName,
            email,
            phone,
            languages,
            experienceLevel,
            taxSoftware,
            createdAt: application.createdAt,
          });
          pdfAttachment = {
            filename: `PreparerApplication_${lastName}_${application.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for preparer application', {
            applicationId: application.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for preparer application', {
            error: pdfError,
            applicationId: application.id,
          });
        }

        // Send single email with CC instead of looping
        const { data: notifyData, error: notifyError } = await getResendClient().emails.send({
          from: fromEmail,
          to: [recipients.primary],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
          subject: `🌐 New Tax Preparer Application: ${firstName} ${lastName}`,
          react: PreparerApplicationNotification({
            firstName,
            middleName,
            lastName,
            email,
            phone,
            languages,
            experienceLevel,
            taxSoftware,
            applicationId: application.id,
          }),
          // Attach PDF with all form data
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });

        if (notifyError) {
          logger.error('Failed to send hiring team notification', {
            error: notifyError,
            to: recipients.primary,
            cc: recipients.cc,
          });
        } else {
          logger.info('Hiring team notification sent', {
            emailId: notifyData?.id,
            to: recipients.primary,
            cc: recipients.cc,
            hasPdf: !!pdfAttachment,
          });
        }
      }
    } catch (emailError) {
      logger.error('Error sending preparer application emails', emailError);
      // Don't fail the request - application was saved successfully
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully! Check your email for confirmation.',
    });
  } catch (error) {
    logger.error('Error submitting preparer application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again or call us at +1 404-627-1015.' },
      { status: 500 }
    );
  }
}

// GET /api/preparers/apply - Get application status by email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const { data: applicationData } = await db
      .from('preparer_applications')
      .select('id, firstName, lastName, email, phone, status, interviewDate, createdAt')
      .eq('email', email.toLowerCase())
      .limit(1);

    const application = firstOrNull(applicationData);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    logger.error('Error fetching application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
