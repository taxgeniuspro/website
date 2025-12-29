/**
 * Appointment API - CRUD operations
 * GET - Fetch appointment details
 * PATCH - Update appointment (general updates, confirm, etc.)
 * DELETE - Delete appointment (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

type RouteParams = Promise<{ id: string }>;

// Local TypeScript interfaces
interface Appointment {
  id: string;
  preparerId: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  type: string;
  status: string;
  scheduledFor: string | null;
  scheduledEnd: string | null;
  duration: number | null;
  notes: string | null;
  clientNotes: string | null;
  subject: string | null;
  location: string | null;
  meetingLink: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  role: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, preparerId:preparer_id, clientId:client_id, clientName:client_name, clientEmail:client_email, clientPhone:client_phone, type, status, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, notes, clientNotes:client_notes, subject, location, meetingLink:meeting_link, timezone, createdAt:created_at, updatedAt:updated_at')
      .eq('id', id)
      .limit(1);
    const appointment = firstOrNull<Appointment>(appointmentData);

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<Profile>(userProfileData);

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to view this appointment' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment,
    });
  } catch (error) {
    logger.error('Error fetching appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing appointment
    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, preparerId:preparer_id, clientId:client_id, status, duration')
      .eq('id', id)
      .limit(1);
    const appointment = firstOrNull<{ id: string; preparerId: string; clientId: string | null; status: string; duration: number | null }>(appointmentData);

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<Profile>(userProfileData);

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to update this appointment' },
        { status: 403 }
      );
    }

    // Build update data (snake_case for Supabase)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating specific fields
    if (body.status) updateData.status = body.status;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.clientNotes !== undefined) updateData.client_notes = body.clientNotes;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.meetingLink !== undefined) updateData.meeting_link = body.meetingLink;
    if (body.type) updateData.type = body.type;
    if (body.duration) updateData.duration = body.duration;

    // Special handling for confirmation
    if (body.action === 'confirm' && appointment.status === 'REQUESTED') {
      updateData.status = 'CONFIRMED';
      // TODO: Send confirmation email to client
    }

    // Special handling for scheduling
    if (body.scheduledFor) {
      updateData.scheduled_for = new Date(body.scheduledFor).toISOString();
      if (body.duration || appointment.duration) {
        const duration = body.duration || appointment.duration;
        updateData.scheduled_end = new Date(
          new Date(body.scheduledFor).getTime() + (duration || 30) * 60000
        ).toISOString();
      }
      if (appointment.status === 'REQUESTED') {
        updateData.status = 'SCHEDULED';
      }
    }

    // Update appointment
    const { data: updatedData, error: updateError } = await db
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }
    const updatedAppointment = updatedData;

    logger.info('Appointment updated:', {
      id: updatedAppointment.id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updatedAppointment,
    });
  } catch (error) {
    logger.error('Error updating appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to update appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Only admins can delete appointments
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<Profile>(userProfileData);

    if (
      userProfile?.role !== 'admin' &&
      userProfile?.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Only administrators can delete appointments' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await db
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete appointment: ${deleteError.message}`);
    }

    logger.info('Appointment deleted:', { id });

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
