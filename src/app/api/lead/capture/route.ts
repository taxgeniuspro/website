import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';
import { addMonths } from 'date-fns';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
}

interface CRMContact {
  id: string;
  assignedPreparerId: string | null;
  referrerUsername: string | null;
  referrerType: string | null;
}

/**
 * Get Owliver Owl's Profile.id as the default preparer assignment.
 * All leads MUST be assigned to a preparer - Owliver is the fallback.
 */
async function getDefaultPreparerId(): Promise<string | null> {
  try {
    // First try to find Owliver by tracking code
    const { data: owliverData } = await db
      .from('profiles')
      .select('id')
      .or('customTrackingCode.eq.ow,trackingCode.eq.ow')
      .in('role', ['admin', 'tax_preparer'])
      .limit(1);

    const owliver = firstOrNull(owliverData) as Profile | null;

    if (owliver) {
      return owliver.id;
    }

    // Try to find by user email
    const { data: owliverByEmail } = await db
      .from('profiles')
      .select('id, users!inner(email)')
      .eq('users.email', 'taxgenius.tax@gmail.com')
      .in('role', ['admin', 'tax_preparer'])
      .limit(1);

    if (owliverByEmail && owliverByEmail.length > 0) {
      return (owliverByEmail[0] as Profile).id;
    }

    // Fallback: find any admin with booking enabled
    const { data: fallbackData } = await db
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('bookingEnabled', true)
      .order('createdAt', { ascending: true })
      .limit(1);

    const fallbackAdmin = firstOrNull(fallbackData) as Profile | null;

    return fallbackAdmin?.id || null;
  } catch (error) {
    logger.error('Failed to get default preparer ID', { error });
    return null;
  }
}

/**
 * POST /api/lead/capture
 *
 * Early lead capture endpoint - saves partial contact info as soon as user
 * starts filling out a form. This allows us to follow up with leads who
 * abandon the form before completing it.
 *
 * Minimal required fields: firstName + (phone OR email)
 *
 * This is a "fire and forget" endpoint - it should never block the user
 * or show errors. Leads are silently captured in the background.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      phone,
      email,
      zipCode,
      source, // 'landing_advance' | 'landing_filing' | 'contact' | 'cash_advance'
      ref, // Referral tracking code
    } = body;

    // Must have firstName and either phone or email
    if (!firstName || (!phone && !email)) {
      return NextResponse.json({ success: false }, { status: 200 }); // Silent fail
    }

    const tax_year = getCurrentFilingTaxYear();

    // Determine attribution from ref code
    let referrerUsername: string | null = null;
    let referrerType: string | null = null;
    let assignedPreparerId: string | null = null;

    if (ref) {
      const { data: referrerData } = await db
        .from('profiles')
        .select('id, role')
        .or(`trackingCode.eq.${ref},customTrackingCode.eq.${ref},shortLinkUsername.eq.${ref}`)
        .limit(1);

      const referrerProfile = firstOrNull(referrerData) as Profile | null;

      if (referrerProfile) {
        referrerUsername = ref;
        referrerType = referrerProfile.role;

        // Assign lead based on referrer role
        if (referrerProfile.role === 'tax_preparer' || referrerProfile.role === 'admin') {
          assignedPreparerId = referrerProfile.id;
        } else {
          // Affiliates and clients → assign to Owliver (default preparer)
          assignedPreparerId = await getDefaultPreparerId();
        }
      } else {
        // Ref code didn't match any profile → assign to Owliver
        assignedPreparerId = await getDefaultPreparerId();
      }
    }

    // If no ref code at all → assign to Owliver (default preparer)
    if (!ref) {
      assignedPreparerId = await getDefaultPreparerId();
    }

    // If we have email, try to upsert to TaxIntakeLead
    if (email) {
      const expiresAt = addMonths(new Date(), 6);

      // Check if lead exists for this email and tax year
      const { data: existingLead } = await db
        .from('tax_intake_leads')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('tax_year', tax_year)
        .limit(1);

      if (existingLead && existingLead.length > 0) {
        // Update existing lead
        const updateData: Record<string, unknown> = {
          first_name: firstName,
        };
        if (lastName) updateData.last_name = lastName;
        if (phone) updateData.phone = phone;
        if (zipCode) updateData.zip_code = zipCode;
        if (referrerUsername) updateData.referrerUsername = referrerUsername;
        if (referrerType) updateData.referrerType = referrerType;
        if (assignedPreparerId) updateData.assignedPreparerId = assignedPreparerId;

        await db
          .from('tax_intake_leads')
          .update(updateData)
          .eq('id', existingLead[0].id);
      } else {
        // Create new lead
        await db
          .from('tax_intake_leads')
          .insert({
            first_name: firstName,
            last_name: lastName || null,
            email: email.toLowerCase(),
            phone: phone || null,
            zip_code: zipCode || null,
            tax_year,
            completed: false,
            referrerUsername,
            referrerType,
            assignedPreparerId,
            expiresAt: expiresAt.toISOString(),
            leadScore: 30, // Low score for early capture
            leadSource: source || 'early_capture',
          });
      }

      logger.info('Early lead captured (email)', {
        email: email.toLowerCase(),
        source,
        ref,
        hasPhone: !!phone,
      });
    }

    // Also create/update CRMContact for unified tracking
    if (email) {
      try {
        // Check if contact exists first to properly handle referrer info
        const { data: existingCRMData } = await db
          .from('crm_contacts')
          .select('id, assignedPreparerId, referrerUsername, referrerType')
          .eq('email', email.toLowerCase())
          .limit(1);

        const existingCRMContact = firstOrNull(existingCRMData) as CRMContact | null;

        if (existingCRMContact) {
          // Update existing contact
          const updateData: Record<string, unknown> = {
            firstName,
          };
          if (lastName) updateData.lastName = lastName;
          if (phone) updateData.phone = phone;
          // Update referrer info if not already set
          if (!existingCRMContact.assignedPreparerId && assignedPreparerId) {
            updateData.assignedPreparerId = assignedPreparerId;
          }
          if (!existingCRMContact.referrerUsername && referrerUsername) {
            updateData.referrerUsername = referrerUsername;
          }
          if (!existingCRMContact.referrerType && referrerType) {
            updateData.referrerType = referrerType;
          }

          await db
            .from('crm_contacts')
            .update(updateData)
            .eq('id', existingCRMContact.id);
        } else {
          // Create new contact
          await db
            .from('crm_contacts')
            .insert({
              contactType: 'LEAD',
              firstName,
              lastName: lastName || null,
              email: email.toLowerCase(),
              phone: phone || null,
              stage: 'NEW',
              source: source || 'early_capture',
              assignedPreparerId,
              referrerUsername,
              referrerType,
              leadScore: 30,
            });
        }
      } catch (crmError) {
        // Silent fail - CRM is secondary
        logger.error('Failed to create CRM contact for early lead', {
          email,
          error: crmError,
        });
      }
    } else if (phone) {
      // If no email but have phone, try to find/create by phone
      try {
        const { data: existingContactData } = await db
          .from('crm_contacts')
          .select('id, assignedPreparerId, referrerUsername, referrerType')
          .eq('phone', phone)
          .limit(1);

        const existingContact = firstOrNull(existingContactData) as CRMContact | null;

        if (existingContact) {
          // Update existing - preserve referrer info if already set
          const updateData: Record<string, unknown> = {
            firstName,
          };
          if (lastName) updateData.lastName = lastName;
          // Update referrer info if not already set
          if (!existingContact.assignedPreparerId && assignedPreparerId) {
            updateData.assignedPreparerId = assignedPreparerId;
          }
          if (!existingContact.referrerUsername && referrerUsername) {
            updateData.referrerUsername = referrerUsername;
          }
          if (!existingContact.referrerType && referrerType) {
            updateData.referrerType = referrerType;
          }

          await db
            .from('crm_contacts')
            .update(updateData)
            .eq('id', existingContact.id);
        } else {
          // Create new with phone only
          await db
            .from('crm_contacts')
            .insert({
              contactType: 'LEAD',
              firstName,
              lastName: lastName || null,
              phone,
              stage: 'NEW',
              source: source || 'early_capture',
              assignedPreparerId,
              referrerUsername,
              referrerType,
              leadScore: 20, // Even lower score without email
            });
        }

        logger.info('Early lead captured (phone only)', {
          phone,
          source,
          ref,
        });
      } catch (phoneError) {
        // Silent fail
        logger.error('Failed to create phone-only lead', {
          phone,
          error: phoneError,
        });
      }
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: 'Early Lead Capture',
      firstName,
      lastName,
      email,
      phone,
      zipCode,
      source,
      refCode: ref,
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Never fail publicly - early lead capture should be invisible
    logger.error('Error in early lead capture:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
