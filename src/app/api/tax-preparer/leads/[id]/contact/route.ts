import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/tax-preparer/leads/:id/contact
 * Records a contact attempt/interaction with a lead
 *
 * Body:
 *  - contactMethod: "CALL" | "EMAIL" | "TEXT" | "IN_PERSON"
 *  - contactNotes: string
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can add contact notes' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;
    const body = await req.json();
    const { contactMethod, contactNotes } = body;

    if (!contactMethod || !contactNotes) {
      return NextResponse.json(
        { error: 'Missing required fields: contactMethod, contactNotes' },
        { status: 400 }
      );
    }

    // Validate contact method
    const validMethods = ['CALL', 'EMAIL', 'TEXT', 'IN_PERSON'];
    if (!validMethods.includes(contactMethod)) {
      return NextResponse.json(
        { error: `Invalid contact method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: { id: true, assignedPreparerId: true, convertedToClient: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check if lead is already converted
    if (lead.convertedToClient) {
      return NextResponse.json(
        { error: 'Lead has already been converted to a client' },
        { status: 400 }
      );
    }

    // Tax preparers can only add notes to their assigned leads
    if (isTaxPreparer) {
      const preparerProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!preparerProfile) {
        return NextResponse.json(
          { error: 'Tax preparer profile not found' },
          { status: 404 }
        );
      }

      if (lead.assignedPreparerId !== preparerProfile.id) {
        return NextResponse.json(
          { error: 'Forbidden: This lead is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Update the lead with contact information
    const updatedLead = await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        contactMethod,
        contactNotes,
        lastContactedAt: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info(
      `📝 Contact note added to lead ${leadId} by ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id} via ${contactMethod}`
    );

    return NextResponse.json({
      success: true,
      message: 'Contact note saved successfully',
      lead: updatedLead,
    });
  } catch (error) {
    logger.error('Error saving contact note:', error);
    return NextResponse.json(
      { error: 'Failed to save contact note' },
      { status: 500 }
    );
  }
}
