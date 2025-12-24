/**
 * Clerk Webhook Handler
 *
 * Syncs Clerk user events with our database:
 * - user.created: Create Profile and CRM contact
 * - user.updated: Update Profile
 * - user.deleted: Soft delete user data
 *
 * Webhook URL: https://taxgeniuspro.tax/api/webhooks/clerk
 */
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { ContactType } from '@prisma/client';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error('Clerk webhook: Missing svix headers');
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Clerk webhook: Missing CLERK_WEBHOOK_SECRET');
    return new Response('Error: Missing webhook secret', { status: 500 });
  }

  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error('Clerk webhook: Verification failed', { error: err });
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle the event
  const eventType = evt.type;

  logger.info('Clerk webhook received', { type: eventType, userId: evt.data.id });

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;

      default:
        logger.info('Clerk webhook: Unhandled event type', { type: eventType });
    }

    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    logger.error('Clerk webhook: Error processing event', { error, eventType });
    return new Response('Error processing webhook', { status: 500 });
  }
}

/**
 * Handle user.created event
 * Creates Profile and CRM contact for new Clerk users
 */
async function handleUserCreated(data: any) {
  const { id: clerkUserId, email_addresses, first_name, last_name, image_url } = data;

  const email = email_addresses?.[0]?.email_address?.toLowerCase();
  if (!email) {
    logger.error('Clerk webhook: No email for new user', { clerkUserId });
    return;
  }

  const firstName = first_name || '';
  const lastName = last_name || '';

  logger.info('Creating profile for Clerk user', { clerkUserId, email });

  try {
    // First, check if a User exists with this email (from previous NextAuth)
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If no user exists, create one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`.trim() || null,
          image: image_url,
        },
      });
      logger.info('Created User for Clerk user', { userId: user.id, clerkUserId });
    }

    // Check if profile exists (by userId or clerkUserId)
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { clerkUserId },
        ],
      },
    });

    if (!profile) {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          clerkUserId,
          role: 'client',
          firstName,
          lastName,
          affiliateStatus: 'APPROVED',
          affiliateApprovedAt: new Date(),
        },
      });
      logger.info('Created Profile for Clerk user', { profileId: profile.id, clerkUserId });

      // Assign tracking code
      try {
        await assignTrackingCodeToUser(profile.id);
        logger.info('Assigned tracking code to Clerk user', { profileId: profile.id });
      } catch (error) {
        logger.error('Failed to assign tracking code', { error, profileId: profile.id });
      }
    } else {
      // Update existing profile with clerkUserId
      await prisma.profile.update({
        where: { id: profile.id },
        data: { clerkUserId },
      });
      logger.info('Updated existing profile with clerkUserId', { profileId: profile.id, clerkUserId });
    }

    // Create or update CRM contact
    const existingContact = await prisma.cRMContact.findUnique({
      where: { email },
    });

    if (existingContact) {
      await prisma.cRMContact.update({
        where: { id: existingContact.id },
        data: {
          userId: user.id,
          firstName: firstName || existingContact.firstName,
          lastName: lastName || existingContact.lastName,
          contactType: ContactType.CLIENT,
          lastContactedAt: new Date(),
        },
      });
      logger.info('Updated CRM contact for Clerk user', { contactId: existingContact.id });
    } else {
      await prisma.cRMContact.create({
        data: {
          userId: user.id,
          email,
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          contactType: ContactType.CLIENT,
          stage: 'NEW',
          source: 'clerk_signup',
        },
      });
      logger.info('Created CRM contact for Clerk user', { email });
    }
  } catch (error) {
    logger.error('Error in handleUserCreated', { error, clerkUserId, email });
    throw error;
  }
}

/**
 * Handle user.updated event
 * Updates Profile when Clerk user is updated
 */
async function handleUserUpdated(data: any) {
  const { id: clerkUserId, email_addresses, first_name, last_name, image_url, public_metadata } = data;

  const email = email_addresses?.[0]?.email_address?.toLowerCase();

  logger.info('Updating profile for Clerk user', { clerkUserId, email });

  try {
    // Find profile by clerkUserId
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId },
      include: { user: true },
    });

    if (!profile) {
      logger.warn('Profile not found for Clerk user update', { clerkUserId });
      return;
    }

    // Update profile
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        firstName: first_name || profile.firstName,
        lastName: last_name || profile.lastName,
        // Update role if set in Clerk metadata
        ...(public_metadata?.role && { role: public_metadata.role }),
      },
    });

    // Update user
    if (profile.user) {
      await prisma.user.update({
        where: { id: profile.user.id },
        data: {
          name: `${first_name || ''} ${last_name || ''}`.trim() || profile.user.name,
          image: image_url || profile.user.image,
          ...(email && { email }),
        },
      });
    }

    logger.info('Updated profile for Clerk user', { profileId: profile.id, clerkUserId });
  } catch (error) {
    logger.error('Error in handleUserUpdated', { error, clerkUserId });
    throw error;
  }
}

/**
 * Handle user.deleted event
 * Soft deletes user data when Clerk user is deleted
 */
async function handleUserDeleted(data: any) {
  const { id: clerkUserId } = data;

  logger.info('Handling user deletion for Clerk user', { clerkUserId });

  try {
    // Find profile
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId },
    });

    if (!profile) {
      logger.warn('Profile not found for Clerk user deletion', { clerkUserId });
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.profile.update({
      where: { id: profile.id },
      data: { isActive: false },
    });

    logger.info('Soft deleted profile for Clerk user', { profileId: profile.id, clerkUserId });
  } catch (error) {
    logger.error('Error in handleUserDeleted', { error, clerkUserId });
    throw error;
  }
}
