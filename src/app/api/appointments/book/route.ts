import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { AppointmentConfirmation } from '../../../../../emails/appointment-confirmation';
import { getAttribution } from '@/lib/services/attribution.service';
import { trackJourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { AvailabilityService } from '@/lib/services/availability.service';
import { addMinutes } from 'date-fns';
import { generateAppointmentPDF } from '@/lib/services/pdf-form-generator.service';

// Local TypeScript interfaces
interface ProfileBase {
  id: string;
  role: string | null;
  userId: string;
}

interface ProfileWithBooking extends ProfileBase {
  bookingEnabled: boolean | null;
  allowPhoneBookings: boolean | null;
  allowVideoBookings: boolean | null;
  allowInPersonBookings: boolean | null;
  requireApprovalForBookings: boolean | null;
  firstName: string | null;
  lastName: string | null;
}

interface CRMContact {
  id: string;
  email: string;
  referrerUsername: string | null;
  assignedPreparerId: string | null;
}

/**
 * POST /api/appointments/book - Book an appointment
 *
 * This endpoint:
 * 1. Validates appointment data
 * 2. Creates Appointment record in database
 * 3. Creates/updates CRMContact record
 * 4. Sends confirmation email to client
 * 5. Sends notification email to business
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      appointmentType = 'CONSULTATION',
      scheduledFor,
      duration = 30, // Default 30 minutes
      serviceId, // Optional: specific service being booked
      notes,
      timezone = 'America/New_York',
      source, // Where did they come from? 'tax_intake', 'preparer_app', 'affiliate_app', 'contact_form'
      ref, // CRITICAL: Explicit referral code from URL ?ref= parameter
      preparerId: explicitPreparerId, // CRITICAL: Explicit preparer ID from booking page
    } = body;

    // Validate required fields
    if (!clientName || !clientEmail || !clientPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, clientEmail, clientPhone' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate appointment type
    const validTypes = ['PHONE_CALL', 'VIDEO_CALL', 'IN_PERSON', 'CONSULTATION', 'FOLLOW_UP'];
    if (!validTypes.includes(appointmentType)) {
      return NextResponse.json(
        { error: `Invalid appointment type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse scheduled date if provided
    let scheduledDate: Date | null = null;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format for scheduledFor' },
          { status: 400 }
        );
      }
    }

    // EPIC 6: Get attribution with priority:
    // 1. Explicit ref parameter (from URL ?ref=)
    // 2. Explicit preparerId (from booking page preparer resolution)
    // 3. Attribution service (cookie → email → phone → direct)
    const attributionResult = await getAttribution(clientEmail, clientPhone);

    // Use explicit ref parameter if provided, otherwise fall back to attribution
    const effectiveRef = ref || attributionResult.attribution.referrerUsername;

    // CRITICAL: Determine lead assignment based on referrer role
    // Note: We track TWO IDs:
    //   - preparerProfileId: Profile.id - used for Appointment.preparerId (schema requirement)
    //   - preparerUserId: Profile.userId - used for CRMContact.assignedPreparerId (for CRM service)
    let preparerProfileId: string | null = null;
    let preparerUserId: string | null = null;

    // PRIORITY 1: If explicit preparerId provided from booking page, use it directly
    if (explicitPreparerId) {
      const { data: explicitPreparerData } = await db
        .from('profiles')
        .select('id, userId:user_id, role')
        .eq('id', explicitPreparerId)
        .limit(1);
      const explicitPreparer = firstOrNull<ProfileBase>(explicitPreparerData);
      if (explicitPreparer && explicitPreparer.role === 'tax_preparer') {
        preparerProfileId = explicitPreparer.id;
        preparerUserId = explicitPreparer.userId;
        logger.info('Appointment assigned via explicit preparerId', {
          preparerProfileId,
          ref: effectiveRef,
        });
      }
    }

    // PRIORITY 2: If ref parameter provided, resolve preparer from it
    if (!preparerProfileId && effectiveRef) {
      // Find the referrer profile by tracking code
      const { data: referrerData } = await db
        .from('profiles')
        .select('id, role, userId:user_id')
        .or(`tracking_code.eq.${effectiveRef},custom_tracking_code.eq.${effectiveRef},short_link_username.eq.${effectiveRef}`)
        .limit(1);
      const referrerProfile = firstOrNull<ProfileBase>(referrerData);

      if (referrerProfile) {
        // Business Rule: Assign lead based on referrer role
        switch (referrerProfile.role) {
          case 'client':
            // CLIENT refers → Assign to Tax Genius (null = corporate)
            // TODO: Look up client's assigned preparer via ClientPreparer relation
            preparerProfileId = null;
            preparerUserId = null;
            logger.info(`Appointment from CLIENT referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'affiliate':
            // AFFILIATE refers → Assign to Tax Genius (null = corporate)
            preparerProfileId = null;
            preparerUserId = null;
            logger.info(`Appointment from AFFILIATE referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'tax_preparer':
            // TAX_PREPARER refers → Assign to THAT tax preparer
            preparerProfileId = referrerProfile.id;
            preparerUserId = referrerProfile.userId;
            logger.info(`Appointment from TAX_PREPARER referral assigned to that preparer`, {
              preparerProfileId,
              preparerUserId,
            });
            break;

          default:
            // Default: assign to Tax Genius
            preparerProfileId = null;
            preparerUserId = null;
            logger.info(`Appointment with unknown referrer role assigned to Tax Genius`, {
              role: referrerProfile.role,
            });
        }
      }
    }

    // Fallback: Get default preparer if no smart assignment
    if (!preparerProfileId) {
      const { data: defaultPreparerData } = await db
        .from('profiles')
        .select('id, userId:user_id')
        .in('role', ['admin', 'tax_preparer'])
        .eq('booking_enabled', true)
        .order('created_at', { ascending: true })
        .limit(1);
      const defaultPreparer = firstOrNull<{ id: string; userId: string }>(defaultPreparerData);
      preparerProfileId = defaultPreparer?.id || null;
      preparerUserId = defaultPreparer?.userId || null;
    }

    // Validate preparer booking preferences
    if (preparerProfileId) {
      const { data: preparerPreferencesData } = await db
        .from('profiles')
        .select('bookingEnabled:booking_enabled, allowPhoneBookings:allow_phone_bookings, allowVideoBookings:allow_video_bookings, allowInPersonBookings:allow_in_person_bookings, requireApprovalForBookings:require_approval_for_bookings, firstName:first_name, lastName:last_name')
        .eq('id', preparerProfileId)
        .limit(1);
      const preparerPreferences = firstOrNull<{
        bookingEnabled: boolean | null;
        allowPhoneBookings: boolean | null;
        allowVideoBookings: boolean | null;
        allowInPersonBookings: boolean | null;
        requireApprovalForBookings: boolean | null;
        firstName: string | null;
        lastName: string | null;
      }>(preparerPreferencesData);

      if (!preparerPreferences || !preparerPreferences.bookingEnabled) {
        return NextResponse.json(
          { error: 'This preparer is not accepting bookings at this time' },
          { status: 400 }
        );
      }

      // Check if the appointment type is allowed
      const typeAllowed =
        (appointmentType === 'PHONE_CALL' && preparerPreferences.allowPhoneBookings) ||
        (appointmentType === 'VIDEO_CALL' && preparerPreferences.allowVideoBookings) ||
        (appointmentType === 'IN_PERSON' && preparerPreferences.allowInPersonBookings) ||
        (appointmentType === 'CONSULTATION' && preparerPreferences.allowVideoBookings) ||
        (appointmentType === 'FOLLOW_UP' && preparerPreferences.allowPhoneBookings);

      if (!typeAllowed) {
        return NextResponse.json(
          {
            error: `${preparerPreferences.firstName} ${preparerPreferences.lastName} does not accept ${appointmentType.replace(/_/g, ' ').toLowerCase()} appointments`,
          },
          { status: 400 }
        );
      }

      // Fluid Booking: Validate slot availability if scheduledFor is provided
      if (scheduledDate && preparerProfileId) {
        const validation = await AvailabilityService.validateBookingSlot(
          preparerProfileId,
          scheduledDate,
          duration,
          serviceId
        );

        if (!validation.valid) {
          return NextResponse.json(
            {
              error: validation.error || 'Selected time slot is not available',
              suggestAlternative: true, // Frontend can fetch available slots
            },
            { status: 400 }
          );
        }

        logger.info('Fluid Booking: Slot validation passed', {
          preparerId: preparerProfileId,
          scheduledFor: scheduledDate.toISOString(),
          duration,
        });
      }
    }

    // Find or create CRMContact
    // Note: CRMContact.assignedPreparerId uses User ID (not Profile ID) for CRM service compatibility
    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const { data: existingContactData } = await db
      .from('crm_contacts')
      .select('id, email, referrerUsername:referrer_username, assignedPreparerId:assigned_preparer_id')
      .eq('email', clientEmail.toLowerCase())
      .limit(1);
    let crmContact = firstOrNull<CRMContact>(existingContactData);

    if (!crmContact) {
      const { data: newContactData, error: createError } = await db
        .from('crm_contacts')
        .insert({
          contact_type: 'LEAD',
          first_name: firstName,
          last_name: lastName,
          email: clientEmail.toLowerCase(),
          phone: clientPhone,
          source: source || 'appointment_booking',
          stage: 'NEW',
          last_contacted_at: new Date().toISOString(),
          assigned_preparer_id: preparerUserId, // Use User ID for CRM service
          // CRITICAL: Track referral attribution
          referrer_username: effectiveRef || null,
          referrer_type: effectiveRef ? 'tax_preparer' : null,
          attribution_method: effectiveRef ? 'ref_param' : (attributionResult.method || 'direct'),
        })
        .select('id, email, referrerUsername:referrer_username, assignedPreparerId:assigned_preparer_id')
        .single();

      if (createError) {
        throw new Error(`Failed to create CRM contact: ${createError.message}`);
      }
      crmContact = newContactData;

      logger.info('Created CRM contact for appointment', {
        contactId: crmContact?.id,
        email: clientEmail,
        referrerUsername: effectiveRef,
        assignedPreparerId: preparerUserId,
      });
    } else if (effectiveRef && !crmContact.referrerUsername) {
      // Update existing contact with referrer info if not already set
      await db
        .from('crm_contacts')
        .update({
          referrer_username: effectiveRef,
          referrer_type: 'tax_preparer',
          attribution_method: 'ref_param',
          assigned_preparer_id: preparerUserId || crmContact.assignedPreparerId,
        })
        .eq('id', crmContact.id);
      logger.info('Updated CRM contact with referrer info', {
        contactId: crmContact.id,
        referrerUsername: effectiveRef,
      });
    }

    // Appointment.preparerId uses Profile ID (as per schema comment)
    const appointmentPreparerId = preparerProfileId || 'unassigned';

    // Determine appointment status based on preparer preferences
    const { data: preparerPrefsData } = await db
      .from('profiles')
      .select('requireApprovalForBookings:require_approval_for_bookings')
      .eq('id', appointmentPreparerId)
      .limit(1);
    const preparerPrefs = firstOrNull<{ requireApprovalForBookings: boolean | null }>(preparerPrefsData);

    const appointmentStatus = preparerPrefs?.requireApprovalForBookings
      ? 'PENDING_APPROVAL'
      : 'REQUESTED';

    // Create appointment
    const { data: appointmentData, error: appointmentError } = await db
      .from('appointments')
      .insert({
        client_id: crmContact?.id,
        client_name: clientName,
        client_email: clientEmail.toLowerCase(),
        client_phone: clientPhone,
        preparer_id: appointmentPreparerId,
        service_id: serviceId || null,
        type: appointmentType,
        status: appointmentStatus,
        scheduled_for: scheduledDate?.toISOString() || null,
        scheduled_end: scheduledDate ? addMinutes(scheduledDate, duration).toISOString() : null,
        duration,
        timezone,
        client_notes: notes || null,
        subject: `${appointmentType.replace(/_/g, ' ')} - ${clientName}`,
      })
      .select('id, createdAt:created_at')
      .single();

    if (appointmentError) {
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }
    const appointment = appointmentData;

    logger.info('Created appointment', {
      appointmentId: appointment.id,
      clientEmail,
      type: appointmentType,
      status: appointmentStatus,
    });

    // Create CRM interaction record for this booking
    try {
      await db.from('crm_interactions').insert({
        contact_id: crmContact?.id,
        type: 'MEETING',
        direction: 'INBOUND',
        subject: `Appointment Requested: ${appointmentType.replace(/_/g, ' ')}`,
        body: `Client requested a ${appointmentType.replace(/_/g, ' ').toLowerCase()} appointment${scheduledDate ? ` for ${scheduledDate.toLocaleString()}` : ''}.\n\nNotes: ${notes || 'No additional notes provided'}`,
        occurred_at: new Date().toISOString(),
      });

      logger.info('Created CRM interaction for appointment booking', {
        appointmentId: appointment.id,
        contactId: crmContact?.id,
      });
    } catch (interactionError) {
      logger.error('Failed to create CRM interaction for appointment', interactionError);
      // Don't fail the whole request
    }

    // Send confirmation email to client
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    // Get preparer name for email
    let preparerName: string | undefined;
    if (preparerProfileId) {
      const { data: assignedPreparerData } = await db
        .from('profiles')
        .select('firstName:first_name, lastName:last_name')
        .eq('id', preparerProfileId)
        .limit(1);
      const assignedPreparer = firstOrNull<{ firstName: string | null; lastName: string | null }>(assignedPreparerData);
      if (assignedPreparer) {
        preparerName = `${assignedPreparer.firstName} ${assignedPreparer.lastName}`;
      }
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Appointment confirmation email (Dev Mode)', {
          to: clientEmail,
          from: fromEmail,
          appointmentId: appointment.id,
          type: appointmentType,
        });
      } else {
        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: clientEmail,
          subject: 'Appointment Confirmed - TaxGeniusPro',
          react: AppointmentConfirmation({
            clientName,
            clientEmail,
            appointmentType,
            scheduledFor: scheduledDate || undefined,
            notes,
            preparerName,
          }),
        });

        if (error) {
          logger.error('Failed to send appointment confirmation email', error);
        } else {
          logger.info('Appointment confirmation email sent', { emailId: data?.id });
        }

        // Generate PDF attachment with all appointment data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateAppointmentPDF({
            id: appointment.id,
            clientName,
            clientEmail,
            clientPhone,
            appointmentType,
            scheduledFor: scheduledDate || undefined,
            duration,
            timezone,
            notes,
            preparerName,
            status: appointmentStatus,
            createdAt: appointment.createdAt,
          });
          pdfAttachment = {
            filename: `Appointment_${firstName}_${appointment.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for appointment', {
            appointmentId: appointment.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for appointment', {
            error: pdfError,
            appointmentId: appointment.id,
          });
        }

        // Also send notification to business admin using centralized email routing
        const { EMAIL_ROUTING } = await import('@/config/email-routing');
        await getResendClient().emails.send({
          from: fromEmail,
          to: [EMAIL_ROUTING.EN.primary],
          cc: [EMAIL_ROUTING.ADMIN],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
          subject: `New Appointment Request: ${clientName} - ${appointmentType}`,
          html: `
            <h2>New Appointment Request</h2>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Phone:</strong> ${clientPhone}</p>
            <p><strong>Type:</strong> ${appointmentType}</p>
            ${scheduledDate ? `<p><strong>Preferred Date/Time:</strong> ${scheduledDate.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: timezone })}</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p><strong>Appointment ID:</strong> ${appointment.id}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/admin/database?search=${clientEmail}">View in Admin Dashboard</a></p>
          `,
          // Attach PDF with all appointment data
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });
      }
    } catch (emailError) {
      logger.error('Error sending appointment emails', emailError);
      // Continue - database save succeeded
    }

    // Send notification email to assigned tax preparer
    // EmailService expects Profile ID for looking up preparer email
    if (preparerProfileId && preparerProfileId !== 'unassigned') {
      try {
        // Import EmailService dynamically to avoid circular dependency
        const { EmailService } = await import('@/lib/services/email.service');

        await EmailService.sendAppointmentNotificationEmail(
          preparerProfileId,
          {
            appointmentId: appointment.id,
            clientName,
            clientEmail,
            clientPhone,
            appointmentType: appointmentType as 'PHONE_CALL' | 'VIDEO_CALL' | 'IN_PERSON' | 'CONSULTATION' | 'FOLLOW_UP',
            scheduledFor: scheduledDate || undefined,
            duration,
            status: appointmentStatus,
            clientNotes: notes,
          }
        );

        logger.info('Preparer notification email sent for appointment', {
          appointmentId: appointment.id,
          preparerId: preparerProfileId,
        });
      } catch (preparerEmailError) {
        logger.error('Error sending preparer notification email', preparerEmailError);
        // Don't fail the request - client email was already sent
      }
    }

    // Track journey stage: APPOINTMENT_BOOKED (Epic 6)
    try {
      const attribution = await getUTMCookie();
      if (attribution) {
        await trackJourneyStage({
          trackingCode: attribution.trackingCode,
          stage: 'INTAKE_STARTED', // Appointment booking counts as intake started
          metadata: {
            appointmentId: appointment.id,
            email: clientEmail,
            type: 'appointment',
          },
        });
      }
    } catch (trackingError) {
      logger.error('Error tracking appointment journey:', trackingError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment request received! We will confirm the details shortly.',
      appointmentId: appointment.id,
      scheduledFor: scheduledDate?.toISOString(),
      attribution: attributionResult.attribution, // Include attribution in response for testing
    });
  } catch (error) {
    logger.error('Error booking appointment', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? { details: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      : { debugHint: errorMessage.substring(0, 100) }; // Show truncated error in prod for debugging
    return NextResponse.json(
      {
        error: 'Failed to book appointment. Please try again or call us at +1 404-627-1015',
        ...errorDetails,
      },
      { status: 500 }
    );
  }
}
