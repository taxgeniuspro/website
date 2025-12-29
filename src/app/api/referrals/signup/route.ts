import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { customAlphabet } from 'nanoid';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { getEmailRecipients } from '@/config/email-routing';
import { generateReferralSignupPDF } from '@/lib/services/pdf-form-generator.service';

// TypeScript interfaces for database tables (replacing @prisma/client types)
interface ReferrerApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralCode: string;
  status: string;
  createdAt: Date;
}

interface CRMContact {
  id: string;
  contactType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  stage: string;
  source: string | null;
  lastContactedAt: Date | null;
}

// Generate unique referral codes
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

// POST /api/referrals/signup - Sign up for referral program
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { firstName, lastName, email, phone, locale } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists (skip in development/test mode to allow repeated testing)
    const allowDuplicates =
      process.env.NODE_ENV === 'development' ||
      process.env.ALLOW_DUPLICATE_TEST_LEADS === 'true' ||
      email.endsWith('@example.com'); // Allow test emails

    // Try to find existing application
    const { data: existingApplicationData } = await db
      .from('referrer_applications')
      .select('*')
      .eq('email', email)
      .limit(1);

    let application: ReferrerApplication | null = firstOrNull(existingApplicationData);

    if (application && !allowDuplicates) {
      return NextResponse.json(
        { error: 'An application with this email already exists' },
        { status: 409 }
      );
    }

    // If application exists and duplicates are allowed (test mode), return existing record
    if (application && allowDuplicates) {
      logger.info('Returning existing referrer application (test mode)', {
        applicationId: application.id,
        email,
        referralCode: application.referralCode,
      });

      return NextResponse.json({
        success: true,
        applicationId: application.id,
        referralCode: application.referralCode,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax'}?ref=${application.referralCode}`,
        message: 'Referral signup successful (existing)',
      });
    }

    // Generate unique referral code
    let referralCode = nanoid();
    let codeExists = true;

    // Ensure code is unique
    while (codeExists) {
      const { data: existingCodeData } = await db
        .from('referrer_applications')
        .select('id')
        .eq('referral_code', referralCode)
        .limit(1);

      if (!existingCodeData || existingCodeData.length === 0) {
        codeExists = false;
      } else {
        referralCode = nanoid();
      }
    }

    // Create new referrer application
    const { data: newApplicationData, error: createError } = await db
      .from('referrer_applications')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        referral_code: referralCode,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (createError || !newApplicationData) {
      logger.error('Failed to create referrer application', { error: createError });
      return NextResponse.json({ error: 'Failed to create referral signup' }, { status: 500 });
    }

    // Map snake_case DB fields to camelCase
    application = {
      id: newApplicationData.id,
      firstName: newApplicationData.first_name,
      lastName: newApplicationData.last_name,
      email: newApplicationData.email,
      phone: newApplicationData.phone,
      referralCode: newApplicationData.referral_code,
      status: newApplicationData.status,
      createdAt: new Date(newApplicationData.created_at),
    };

    logger.info('Referrer application created', {
      applicationId: application.id,
      email: application.email,
      referralCode: application.referralCode,
    });

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax'}?ref=${referralCode}`;

    try {
      // First try to find existing CRM contact
      const { data: existingContact } = await db
        .from('crm_contacts')
        .select('*')
        .eq('email', email.toLowerCase())
        .limit(1);

      let crmContact: CRMContact;

      if (existingContact && existingContact.length > 0) {
        // Update existing contact
        const { data: updatedContact, error: updateError } = await db
          .from('crm_contacts')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone,
            last_contacted_at: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase())
          .select()
          .single();

        if (updateError || !updatedContact) {
          throw new Error('Failed to update CRM contact');
        }
        crmContact = {
          id: updatedContact.id,
          contactType: updatedContact.contact_type,
          firstName: updatedContact.first_name,
          lastName: updatedContact.last_name,
          email: updatedContact.email,
          phone: updatedContact.phone,
          stage: updatedContact.stage,
          source: updatedContact.source,
          lastContactedAt: updatedContact.last_contacted_at ? new Date(updatedContact.last_contacted_at) : null,
        };
      } else {
        // Create new contact
        const { data: newContact, error: createError } = await db
          .from('crm_contacts')
          .insert({
            contact_type: 'AFFILIATE',
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            phone,
            stage: 'NEW',
            source: 'referral_program_signup',
            last_contacted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError || !newContact) {
          throw new Error('Failed to create CRM contact');
        }
        crmContact = {
          id: newContact.id,
          contactType: newContact.contact_type,
          firstName: newContact.first_name,
          lastName: newContact.last_name,
          email: newContact.email,
          phone: newContact.phone,
          stage: newContact.stage,
          source: newContact.source,
          lastContactedAt: newContact.last_contacted_at ? new Date(newContact.last_contacted_at) : null,
        };
      }

      logger.info('CRM contact created/updated from referral signup', {
        contactId: crmContact.id,
        applicationId: application.id,
        referralCode,
      });

      // Create CRMInteraction to log the referral signup
      await db.from('crm_interactions').insert({
        contact_id: crmContact.id,
        type: 'NOTE',
        direction: 'INBOUND',
        subject: 'Referral Program Signup',
        body: `**Referral Program Signup**

**Referrer Information:**
- Name: ${firstName} ${lastName}
- Email: ${email}
- Phone: ${phone}
- Status: ACTIVE

**Referral Details:**
- Referral Code: ${referralCode}
- Referral Link: ${referralLink}

**Application ID:** ${application.id}

This person has joined the referral program and can now start earning commissions by referring clients.`,
        occurred_at: new Date().toISOString(),
      });

      logger.info('CRM interaction created for referral signup', {
        contactId: crmContact.id,
        applicationId: application.id,
      });
    } catch (crmError) {
      // Log error but don't fail the request
      logger.error('Failed to create CRM contact/interaction', {
        error: crmError,
        applicationId: application.id,
        email,
      });
    }

    // ========================================
    // EMAIL NOTIFICATIONS
    // Send notification emails to admin team
    // Language-based routing using centralized config:
    // Spanish → Goldenprotaxes@gmail.com (Ale Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // English → taxgenius.taxes@gmail.com (Ray Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // ========================================
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

    logger.info('Referral signup language-based routing', {
      locale: locale || 'en',
      primaryRecipient: recipients.primary,
      ccRecipient: recipients.cc,
    });

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Referral signup email (Dev Mode)', {
          to: recipients.primary,
          cc: recipients.cc,
          from: fromEmail,
          referralCode,
          referralLink,
        });
      } else {
        // Generate PDF attachment with all referral signup data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateReferralSignupPDF({
            id: application.id,
            firstName,
            lastName,
            email,
            phone,
            referralCode,
            referralLink,
            createdAt: application.createdAt,
          });
          pdfAttachment = {
            filename: `ReferralSignup_${lastName}_${application.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for referral signup', {
            applicationId: application.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for referral signup', {
            error: pdfError,
            applicationId: application.id,
          });
        }

        // Send notification to admin team (primary + CC)
        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [recipients.primary],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
          subject: `🌐 New Referral Program Signup: ${firstName} ${lastName}`,
          html: `
            <h2>New Referral Program Signup</h2>

            <p><strong>A new person has joined the referral program!</strong></p>

            <h3>Referrer Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
            </ul>

            <h3>Referral Details:</h3>
            <ul>
              <li><strong>Referral Code:</strong> ${referralCode}</li>
              <li><strong>Referral Link:</strong> <a href="${referralLink}">${referralLink}</a></li>
              <li><strong>Application ID:</strong> ${application.id}</li>
            </ul>

            <p>This person can now start earning commissions by referring clients using their unique referral code.</p>

            <hr />
            <p style="color: #666; font-size: 12px;">This is an automated notification from Tax Genius Pro</p>
          `,
          // Attach PDF with all referral data
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });

        if (error) {
          logger.error('Failed to send referral signup notification email', error);
        } else {
          logger.info('Referral signup notification email sent', {
            emailId: data?.id,
            to: recipients.primary,
            cc: recipients.cc,
            hasPdf: !!pdfAttachment,
          });
        }
      }
    } catch (emailError) {
      logger.error('Error sending referral signup email', emailError);
      // Continue - database save succeeded
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      referralCode: application.referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax'}?ref=${referralCode}`,
      message: 'Referral signup successful',
    });
  } catch (error) {
    logger.error('Error creating referral signup:', error);
    return NextResponse.json({ error: 'Failed to create referral signup' }, { status: 500 });
  }
}

// GET /api/referrals/signup - Get referrer info by email or code
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const code = searchParams.get('code');

    if (!email && !code) {
      return NextResponse.json({ error: 'Email or code parameter required' }, { status: 400 });
    }

    let query = db
      .from('referrer_applications')
      .select('id, first_name, last_name, email, phone, referral_code, status, created_at');

    if (email) {
      query = query.eq('email', email);
    } else if (code) {
      query = query.eq('referral_code', code);
    }

    const { data: applicationData, error } = await query.limit(1);

    if (error || !applicationData || applicationData.length === 0) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    const dbApp = applicationData[0];
    const application = {
      id: dbApp.id,
      firstName: dbApp.first_name,
      lastName: dbApp.last_name,
      email: dbApp.email,
      phone: dbApp.phone,
      referralCode: dbApp.referral_code,
      status: dbApp.status,
      createdAt: dbApp.created_at,
    };

    return NextResponse.json({
      application,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax'}?ref=${application.referralCode}`,
    });
  } catch (error) {
    logger.error('Error fetching referrer:', error);
    return NextResponse.json({ error: 'Failed to fetch referrer' }, { status: 500 });
  }
}
