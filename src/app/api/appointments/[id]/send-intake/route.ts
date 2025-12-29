/**
 * Send Intake Form Link API
 *
 * POST /api/appointments/[id]/send-intake
 *
 * Sends the tax intake form link to the client:
 * - On desktop: Sends email with intake form link
 * - On mobile: Sends SMS with intake form link
 *
 * The device type is determined by the `sendMethod` parameter:
 * - 'email': Send via email
 * - 'sms': Send via SMS (opens SMS app on mobile)
 * - 'auto': Auto-detect based on user agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { getUserPermissions, UserRole } from '@/lib/permissions';

// Local TypeScript interfaces
interface AppointmentInfo {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  preparerId: string;
  status: string;
}

interface PreparerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  shortLinkUsername: string | null;
}

interface UserProfile {
  id: string;
  role: string | null;
  permissions: Record<string, unknown> | null;
}

interface CRMContact {
  id: string;
  email: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: appointmentId } = await params;

    // Check permissions
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role, permissions')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<UserProfile>(userProfileData);

    const role = userProfile?.role as UserRole | undefined;
    const permissions = getUserPermissions(role || 'client', userProfile?.permissions as any);

    if (!permissions.calendar_view && !permissions.calendar) {
      return NextResponse.json(
        { error: 'You do not have permission to send intake forms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sendMethod = 'email' } = body;

    // Get the appointment
    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, clientName:client_name, clientEmail:client_email, clientPhone:client_phone, preparerId:preparer_id, status')
      .eq('id', appointmentId)
      .limit(1);
    const appointment = firstOrNull<AppointmentInfo>(appointmentData);

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Get the preparer's tracking code to build the intake link
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName:first_name, lastName:last_name, trackingCode:tracking_code, customTrackingCode:custom_tracking_code, shortLinkUsername:short_link_username')
      .eq('id', appointment.preparerId)
      .limit(1);
    const preparer = firstOrNull<PreparerProfile>(preparerData);

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    // Use the preparer's tracking code for the intake link
    const trackingCode = preparer.customTrackingCode || preparer.trackingCode || preparer.shortLinkUsername;

    if (!trackingCode) {
      return NextResponse.json(
        { error: 'Preparer does not have a tracking code configured' },
        { status: 400 }
      );
    }

    // Build the intake form URL
    const intakeUrl = `${APP_URL}/go/${trackingCode}-intake`;
    const preparerName = `${preparer.firstName} ${preparer.lastName}`.trim();

    if (sendMethod === 'sms') {
      // Return SMS-ready data (client will open SMS app)
      const smsBody = `Hi ${appointment.clientName.split(' ')[0]}! ${preparerName} from Tax Genius Pro has sent you a tax intake form. Please complete it here: ${intakeUrl}`;

      // Log the SMS send attempt
      logger.info('Intake form SMS prepared', {
        appointmentId,
        clientPhone: appointment.clientPhone,
        preparerId: preparer.id,
      });

      return NextResponse.json({
        success: true,
        method: 'sms',
        phone: appointment.clientPhone,
        message: smsBody,
        intakeUrl,
        // Return sms: URI for direct SMS opening
        smsUri: `sms:${appointment.clientPhone}?body=${encodeURIComponent(smsBody)}`,
      });
    } else {
      // Send email
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

      try {
        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: appointment.clientEmail,
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all client communications
          subject: `Complete Your Tax Intake Form - ${preparerName}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin-bottom: 10px;">Tax Genius Pro</h1>
    <p style="color: #666; font-size: 14px;">Your trusted tax preparation partner</p>
  </div>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #1a365d; margin-top: 0;">Hello ${appointment.clientName.split(' ')[0]}!</h2>
    <p>${preparerName} has requested that you complete your tax intake form to get started with your tax preparation.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${intakeUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
      Complete Intake Form
    </a>
  </div>

  <div style="background: #e8f4f8; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px;"><strong>What to have ready:</strong></p>
    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
      <li>W-2 forms from employers</li>
      <li>1099 forms (if applicable)</li>
      <li>Social Security numbers for you and dependents</li>
      <li>Last year's tax return (if available)</li>
    </ul>
  </div>

  <p style="font-size: 14px; color: #666;">If you have any questions, please don't hesitate to reach out to ${preparerName}.</p>

  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    This email was sent by Tax Genius Pro on behalf of ${preparerName}.<br>
    <a href="${APP_URL}" style="color: #2563eb;">taxgeniuspro.tax</a>
  </p>
</body>
</html>
          `,
        });

        if (error) {
          logger.error('Failed to send intake form email', { error, appointmentId });
          return NextResponse.json(
            { error: 'Failed to send email', details: error.message },
            { status: 500 }
          );
        }

        logger.info('Intake form email sent', {
          appointmentId,
          clientEmail: appointment.clientEmail,
          preparerId: preparer.id,
          emailId: data?.id,
        });

        // Create a CRM interaction to track this
        try {
          const { data: crmContactData } = await db
            .from('crm_contacts')
            .select('id, email')
            .eq('email', appointment.clientEmail.toLowerCase())
            .limit(1);
          const crmContact = firstOrNull<CRMContact>(crmContactData);

          if (crmContact) {
            await db.from('crm_interactions').insert({
              contact_id: crmContact.id,
              type: 'EMAIL',
              direction: 'OUTBOUND',
              subject: 'Intake Form Link Sent',
              body: `Tax preparer ${preparerName} sent the intake form link to ${appointment.clientEmail}`,
              occurred_at: new Date().toISOString(),
            });
          }
        } catch (crmError) {
          // Don't fail the whole request if CRM tracking fails
          logger.error('Failed to create CRM interaction for intake form send', crmError);
        }

        return NextResponse.json({
          success: true,
          method: 'email',
          email: appointment.clientEmail,
          intakeUrl,
          emailId: data?.id,
        });
      } catch (emailError) {
        logger.error('Error sending intake form email', emailError);
        return NextResponse.json(
          { error: 'Failed to send email' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error('Error in send-intake endpoint', error);
    return NextResponse.json(
      { error: 'Failed to send intake form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
