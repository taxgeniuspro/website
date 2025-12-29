import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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
    const { data: currentUserProfile } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .single();

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const taxYear = searchParams.get('taxYear');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    // Build query based on role
    let query = db.from('client_tax_forms').select('*');

    // Filter by tax year if provided
    if (taxYear) {
      query = query.eq('taxYear', parseInt(taxYear));
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Role-based filtering
    if (currentUserProfile.role === 'client') {
      // Clients see only their own forms
      query = query.eq('clientId', currentUserProfile.id);
    } else if (currentUserProfile.role === 'tax_preparer') {
      // Tax preparers see forms they assigned
      query = query.eq('assignedBy', currentUserProfile.id);
      if (clientId) {
        query = query.eq('clientId', clientId);
      }
    } else if (currentUserProfile.role === 'admin') {
      // Admins see all forms, optionally filtered by clientId
      if (clientId) {
        query = query.eq('clientId', clientId);
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch forms
    const { data: clientTaxForms, error: formsError } = await query
      .order('taxYear', { ascending: false })
      .order('createdAt', { ascending: false });

    if (formsError) {
      throw formsError;
    }

    // Get all unique IDs for related data
    const taxFormIds = [...new Set((clientTaxForms || []).map((f: any) => f.taxFormId))];
    const clientIds = [...new Set((clientTaxForms || []).map((f: any) => f.clientId))];
    const assignedByIds = [...new Set((clientTaxForms || []).map((f: any) => f.assignedBy))];
    const formIds = (clientTaxForms || []).map((f: any) => f.id);

    // Fetch related data in parallel
    const [taxFormsResult, clientsResult, assignersResult, sharesResult, signaturesResult] = await Promise.all([
      taxFormIds.length > 0 ? db.from('tax_forms').select('id, formNumber, title, description, category, fileUrl').in('id', taxFormIds) : { data: [] },
      clientIds.length > 0 ? db.from('profiles').select('id, firstName, lastName').in('id', clientIds) : { data: [] },
      assignedByIds.length > 0 ? db.from('profiles').select('id, firstName, lastName, companyName').in('id', assignedByIds) : { data: [] },
      formIds.length > 0 ? db.from('tax_form_shares').select('id, shareToken, expiresAt, accessCount, lastAccessAt, clientTaxFormId').in('clientTaxFormId', formIds).order('createdAt', { ascending: false }) : { data: [] },
      formIds.length > 0 ? db.from('form_signatures').select('id, signedBy, signedByRole, signedAt, clientTaxFormId').in('clientTaxFormId', formIds) : { data: [] },
    ]);

    // Create lookup maps
    const taxFormMap = new Map((taxFormsResult.data || []).map((tf: any) => [tf.id, tf]));
    const clientMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]));
    const assignerMap = new Map((assignersResult.data || []).map((a: any) => [a.id, a]));

    // Group shares and signatures by clientTaxFormId (take first share per form)
    const shareMap = new Map<string, any>();
    for (const share of (sharesResult.data || [])) {
      if (!shareMap.has(share.clientTaxFormId)) {
        shareMap.set(share.clientTaxFormId, share);
      }
    }
    const signatureMap = new Map<string, any[]>();
    for (const sig of (signaturesResult.data || [])) {
      if (!signatureMap.has(sig.clientTaxFormId)) {
        signatureMap.set(sig.clientTaxFormId, []);
      }
      signatureMap.get(sig.clientTaxFormId)!.push(sig);
    }

    // Transform response
    const forms = (clientTaxForms || []).map((ctf: any) => {
      const taxForm = taxFormMap.get(ctf.taxFormId);
      const client = clientMap.get(ctf.clientId);
      const assigner = assignerMap.get(ctf.assignedBy);
      const latestShare = shareMap.get(ctf.id);
      const signatures = signatureMap.get(ctf.id) || [];

      const hasClientSignature = signatures.some((sig: any) => sig.signedBy === ctf.clientId);
      const hasPreparerSignature = signatures.some((sig: any) => sig.signedBy === ctf.assignedBy);

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
        taxForm: taxForm || null,
        client: {
          id: client?.id,
          name: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Unknown',
        },
        preparer: {
          id: assigner?.id,
          name: assigner ? `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() : 'Unknown',
          company: assigner?.companyName,
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
          all: signatures,
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
