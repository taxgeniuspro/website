import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';
import { AppointmentConfirmation } from '../../../../../emails/appointment-confirmation';
import { getAttribution } from '@/lib/services/attribution.service';
import { trackJourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { AvailabilityService } from '@/lib/services/availability.service';
import { addMinutes } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // EPIC 6: Get attribution (cookie → email → phone → direct)
    const attributionResult = await getAttribution(clientEmail, clientPhone);

    // CRITICAL: Determine lead assignment based on referrer role
    let assignedPreparerId: string | null = null;

    if (attributionResult.attribution.referrerUsername) {
      // Find the referrer profile
      const referrerProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: attributionResult.attribution.referrerUsername },
            { customTrackingCode: attributionResult.attribution.referrerUsername },
            { shortLinkUsername: attributionResult.attribution.referrerUsername },
          ],
        },
        select: {
          id: true,
          role: true,
          userId: true,
        },
      });

      if (referrerProfile) {
        // Business Rule: Assign lead based on referrer role
        switch (referrerProfile.role) {
          case 'CLIENT':
            // CLIENT refers → Assign to Tax Genius (null = corporate)
            // TODO: Look up client's assigned preparer via ClientPreparer relation
            assignedPreparerId = null;
            logger.info(`Appointment from CLIENT referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'AFFILIATE':
            // AFFILIATE refers → Assign to Tax Genius (null = corporate)
            assignedPreparerId = null;
            logger.info(`Appointment from AFFILIATE referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'TAX_PREPARER':
            // TAX_PREPARER refers → Assign to THAT tax preparer
            assignedPreparerId = referrerProfile.id;
            logger.info(`Appointment from TAX_PREPARER referral assigned to that preparer`, {
              preparerId: assignedPreparerId,
            });
            break;

          case 'REFERRER':
            // REFERRER refers → Assign to Tax Genius (null = corporate)
            assignedPreparerId = null;
            logger.info(`Appointment from REFERRER assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          default:
            // Default: assign to Tax Genius
            assignedPreparerId = null;
            logger.info(`Appointment with unknown referrer role assigned to Tax Genius`, {
              role: referrerProfile.role,
            });
        }
      }
    }

    // Fallback: Get default preparer if no smart assignment
    if (!assignedPreparerId) {
      const defaultPreparer = await prisma.profile.findFirst({
        where: {
          OR: [{ role: 'super_admin' }, { role: 'admin' }, { role: 'tax_preparer' }],
          bookingEnabled: true, // Only assign to preparers who accept bookings
        },
        orderBy: { createdAt: 'asc' },
      });
      assignedPreparerId = defaultPreparer?.id || null;
    }

    // Validate preparer booking preferences
    if (assignedPreparerId) {
      const preparerPreferences = await prisma.profile.findUnique({
        where: { id: assignedPreparerId },
        select: {
          bookingEnabled: true,
          allowPhoneBookings: true,
          allowVideoBookings: true,
          allowInPersonBookings: true,
          requireApprovalForBookings: true,
          firstName: true,
          lastName: true,
        },
      });

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
      if (scheduledDate && assignedPreparerId) {
        const validation = await AvailabilityService.validateBookingSlot(
          assignedPreparerId,
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
          preparerId: assignedPreparerId,
          scheduledFor: scheduledDate.toISOString(),
          duration,
        });
      }
    }

    // Find or create CRMContact
    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    let crmContact = await prisma.cRMContact.findUnique({
      where: { email: clientEmail.toLowerCase() },
    });

    if (!crmContact) {
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',
          firstName,
          lastName,
          email: clientEmail.toLowerCase(),
          phone: clientPhone,
          source: source || 'appointment_booking',
          stage: 'NEW',
          lastContactedAt: new Date(),
          assignedPreparerId: assignedPreparerId,
        },
      });

      logger.info('Created CRM contact for appointment', {
        contactId: crmContact.id,
        email: clientEmail,
      });
    }

    const preparerId = assignedPreparerId || 'unassigned';

    // Determine appointment status based on preparer preferences
    const preparerPrefs = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { requireApprovalForBookings: true },
    });

    const appointmentStatus = preparerPrefs?.requireApprovalForBookings
      ? 'PENDING_APPROVAL'
      : 'REQUESTED';

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId: crmContact.id,
        clientName,
        clientEmail: clientEmail.toLowerCase(),
        clientPhone,
        preparerId,
        serviceId: serviceId || null,
        type: appointmentType as
          | 'PHONE_CALL'
          | 'VIDEO_CALL'
          | 'IN_PERSON'
          | 'CONSULTATION'
          | 'FOLLOW_UP',
        status: appointmentStatus,
        scheduledFor: scheduledDate,
        scheduledEnd: scheduledDate ? addMinutes(scheduledDate, duration) : null,
        duration,
        timezone,
        clientNotes: notes || null,
        subject: `${appointmentType.replace(/_/g, ' ')} - ${clientName}`,
      },
    });

    logger.info('Created appointment', {
      appointmentId: appointment.id,
      clientEmail,
      type: appointmentType,
      status: appointmentStatus,
    });

    // Create CRM interaction record for this booking
    try {
      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'MEETING',
          direction: 'INBOUND',
          subject: `Appointment Requested: ${appointmentType.replace(/_/g, ' ')}`,
          body: `Client requested a ${appointmentType.replace(/_/g, ' ').toLowerCase()} appointment${scheduledDate ? ` for ${scheduledDate.toLocaleString()}` : ''}.\n\nNotes: ${notes || 'No additional notes provided'}`,
          occurredAt: new Date(),
        },
      });

      logger.info('Created CRM interaction for appointment booking', {
        appointmentId: appointment.id,
        contactId: crmContact.id,
      });
    } catch (interactionError) {
      logger.error('Failed to create CRM interaction for appointment', interactionError);
      // Don't fail the whole request
    }

    // Send confirmation email to client
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    // Get preparer name for email
    let preparerName: string | undefined;
    if (assignedPreparerId) {
      const assignedPreparer = await prisma.profile.findUnique({
        where: { id: assignedPreparerId },
        select: { firstName: true, lastName: true },
      });
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
        const { data, error } = await resend.emails.send({
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

        // Also send notification to business
        await resend.emails.send({
          from: fromEmail,
          to: 'taxgenius.tax@gmail.com',
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
        });
      }
    } catch (emailError) {
      logger.error('Error sending appointment emails', emailError);
      // Continue - database save succeeded
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
    return NextResponse.json(
      {
        error: 'Failed to book appointment. Please try again or call us at +1 404-627-1015',
      },
      { status: 500 }
    );
  }
}
