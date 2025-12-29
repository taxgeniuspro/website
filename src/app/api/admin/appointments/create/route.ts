/**
 * Admin API - Create Appointment
 * Allows admin/tax preparer to manually create appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getUserPermissions, UserRole } from '@/lib/permissions';

// Local interfaces
interface Profile {
  id: string;
  userId: string;
  role: string;
  permissions: Record<string, boolean> | null;
  email: string | null;
}

interface Lead {
  id: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('*')
      .eq('userId', session.user.id)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const userProfile = firstOrNull<Profile>(profileData);

    const role = userProfile?.role as UserRole | undefined;
    const permissions = getUserPermissions(
      role || 'client',
      userProfile?.permissions as any
    );

    if (!permissions.calendar_create) {
      return NextResponse.json(
        { error: 'You do not have permission to create appointments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      preparerId,
      type,
      scheduledFor,
      duration,
      subject,
      notes,
      location,
      meetingLink,
    } = body;

    // Validate required fields
    if (!clientName || !clientEmail || !clientPhone) {
      return NextResponse.json(
        { error: 'Client name, email, and phone are required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Appointment type is required' },
        { status: 400 }
      );
    }

    // Use provided preparerId or current user if they are a preparer
    let assignedPreparerId = preparerId;
    if (!assignedPreparerId && role === 'tax_preparer') {
      assignedPreparerId = userProfile?.id;
    }

    if (!assignedPreparerId) {
      return NextResponse.json(
        { error: 'Tax preparer must be assigned' },
        { status: 400 }
      );
    }

    // Try to find existing client/lead by email
    let clientId: string | null = null;
    const { data: existingProfileData } = await db.from('profiles')
      .select('id')
      .ilike('email', clientEmail.toLowerCase())
      .limit(1);

    const existingProfile = firstOrNull<{ id: string }>(existingProfileData);

    if (existingProfile) {
      clientId = existingProfile.id;
    } else {
      // Check in leads
      const { data: leadData } = await db.from('leads')
        .select('id')
        .ilike('email', clientEmail.toLowerCase())
        .limit(1);

      const existingLead = firstOrNull<{ id: string }>(leadData);
      if (existingLead) {
        clientId = existingLead.id;
      }
    }

    // If no existing client/lead, we'll use a placeholder
    // In production, you might want to create a lead automatically
    if (!clientId) {
      clientId = 'manual-appointment'; // Placeholder
    }

    // Calculate scheduled end if scheduledFor is provided
    let scheduledEnd: string | null = null;
    if (scheduledFor && duration) {
      scheduledEnd = new Date(
        new Date(scheduledFor).getTime() + duration * 60000
      ).toISOString();
    }

    // Determine status based on whether it's scheduled or just requested
    const status = scheduledFor ? 'SCHEDULED' : 'REQUESTED';

    // Create appointment
    const { data: appointment, error: createError } = await db.from('appointments')
      .insert({
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        preparerId: assignedPreparerId,
        type,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        scheduledEnd,
        duration: duration || 60, // Default 60 minutes
        subject,
        notes,
        location,
        meetingLink,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('Appointment created manually:', {
      id: appointment.id,
      createdBy: session.user.email,
    });

    // TODO: Send confirmation email to client
    // TODO: Send notification to preparer if different from creator

    return NextResponse.json({
      success: true,
      message: 'Appointment created successfully',
      appointment,
    });
  } catch (error) {
    logger.error('Error creating appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
