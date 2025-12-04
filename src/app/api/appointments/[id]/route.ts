/**
 * Appointment API - CRUD operations
 * GET - Fetch appointment details
 * PATCH - Update appointment (general updates, confirm, etc.)
 * DELETE - Delete appointment (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

type RouteParams = Promise<{ id: string }>;

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

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

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
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to update this appointment' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Allow updating specific fields
    if (body.status) updateData.status = body.status;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.clientNotes !== undefined) updateData.clientNotes = body.clientNotes;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink;
    if (body.type) updateData.type = body.type;
    if (body.duration) updateData.duration = body.duration;

    // Special handling for confirmation
    if (body.action === 'confirm' && appointment.status === 'REQUESTED') {
      updateData.status = 'CONFIRMED';
      // TODO: Send confirmation email to client
    }

    // Special handling for scheduling
    if (body.scheduledFor) {
      updateData.scheduledFor = new Date(body.scheduledFor);
      if (body.duration || appointment.duration) {
        const duration = body.duration || appointment.duration;
        updateData.scheduledEnd = new Date(
          new Date(body.scheduledFor).getTime() + duration * 60000
        );
      }
      if (appointment.status === 'REQUESTED') {
        updateData.status = 'SCHEDULED';
      }
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

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
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (
      userProfile?.role !== 'admin' &&
      userProfile?.role !== 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Only administrators can delete appointments' },
        { status: 403 }
      );
    }

    await prisma.appointment.delete({
      where: { id },
    });

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
