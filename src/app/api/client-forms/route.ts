import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/client-forms
 * List all forms for the current user based on their role
 *
 * For clients: Shows forms assigned to them
 * For tax_preparers: Shows forms they've assigned to clients
 * For admins: Shows all forms (with optional clientId filter)
 *
 * Query params:
 * - taxYear: Filter by tax year
 * - status: Filter by status (ASSIGNED, IN_PROGRESS, COMPLETED, REVIEWED)
 * - clientId: Filter by specific client (tax_preparer/admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const currentUserProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const taxYear = searchParams.get('taxYear');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    // Build where clause based on role
    const where: any = {};

    // Filter by tax year if provided
    if (taxYear) {
      where.taxYear = parseInt(taxYear);
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Role-based filtering
    if (currentUserProfile.role === 'client') {
      // Clients see only their own forms
      where.clientId = currentUserProfile.id;
    } else if (currentUserProfile.role === 'tax_preparer') {
      // Tax preparers see forms they assigned
      // Unless they specify a clientId
      if (clientId) {
        where.clientId = clientId;
        where.assignedBy = currentUserProfile.id;
      } else {
        where.assignedBy = currentUserProfile.id;
      }
    } else if (currentUserProfile.role === 'admin' || currentUserProfile.role === 'super_admin') {
      // Admins see all forms, optionally filtered by clientId
      if (clientId) {
        where.clientId = clientId;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch forms with related data
    const clientTaxForms = await prisma.clientTaxForm.findMany({
      where,
      include: {
        taxForm: {
          select: {
            id: true,
            formNumber: true,
            title: true,
            description: true,
            category: true,
            fileUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedByProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        shares: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            shareToken: true,
            expiresAt: true,
            accessCount: true,
            lastAccessAt: true,
          },
        },
        signatures: {
          select: {
            id: true,
            signedBy: true,
            signedByRole: true,
            signedAt: true,
          },
        },
      },
      orderBy: [
        { taxYear: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform response
    const forms = clientTaxForms.map((ctf) => {
      const latestShare = ctf.shares[0];
      const hasClientSignature = ctf.signatures.some((sig) => sig.signedBy === ctf.clientId);
      const hasPreparerSignature = ctf.signatures.some((sig) => sig.signedBy === ctf.assignedBy);

      return {
        id: ctf.id,
        status: ctf.status,
        taxYear: ctf.taxYear,
        progress: ctf.progress,
        notes: ctf.notes,
        startedAt: ctf.startedAt,
        completedAt: ctf.completedAt,
        lastEditedAt: ctf.lastEditedAt,
        createdAt: ctf.createdAt,
        taxForm: ctf.taxForm,
        client: {
          id: ctf.client.id,
          name: `${ctf.client.firstName} ${ctf.client.lastName}`,
        },
        preparer: {
          id: ctf.assignedByProfile.id,
          name: `${ctf.assignedByProfile.firstName} ${ctf.assignedByProfile.lastName}`,
          company: ctf.assignedByProfile.companyName,
        },
        share: latestShare
          ? {
              shareToken: latestShare.shareToken,
              shareUrl: `${process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax'}/shared-forms/${latestShare.shareToken}`,
              expiresAt: latestShare.expiresAt,
              accessCount: latestShare.accessCount,
              lastAccessAt: latestShare.lastAccessAt,
            }
          : null,
        signatures: {
          client: hasClientSignature,
          preparer: hasPreparerSignature,
          all: ctf.signatures,
        },
      };
    });

    // Group by tax year for easier UI rendering
    const formsByYear = forms.reduce(
      (acc, form) => {
        if (!acc[form.taxYear]) {
          acc[form.taxYear] = [];
        }
        acc[form.taxYear].push(form);
        return acc;
      },
      {} as Record<number, typeof forms>
    );

    logger.info(`Client forms retrieved: ${forms.length} forms for user ${currentUserProfile.id}`);

    return NextResponse.json({
      success: true,
      forms,
      formsByYear,
      totalCount: forms.length,
      stats: {
        assigned: forms.filter((f) => f.status === 'ASSIGNED').length,
        inProgress: forms.filter((f) => f.status === 'IN_PROGRESS').length,
        completed: forms.filter((f) => f.status === 'COMPLETED').length,
        reviewed: forms.filter((f) => f.status === 'REVIEWED').length,
      },
    });
  } catch (error) {
    logger.error('Error fetching client forms:', error);
    return NextResponse.json({ error: 'Failed to fetch client forms' }, { status: 500 });
  }
}
