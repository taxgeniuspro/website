import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  role: string | null;
  affiliateStatus: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  shortLinkUsername: string | null;
}

interface TaxIntakeLead {
  id: string;
  first_name: string;
  last_name: string;
  referrerUsername: string | null;
  attributionMethod: string | null;
  convertedToClient: boolean;
  created_at: string;
  updated_at: string;
  lastContactedAt?: string | null;
}

/**
 * GET /api/affiliate/leads
 * Fetches leads referred by the authenticated affiliate
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check role and tracking code
    // Use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, affiliateStatus, trackingCode, customTrackingCode, shortLinkUsername')
      .or(`supabaseUserId.eq.${user.id},userId.eq.${user.id},email.eq.${user.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json(
        { error: 'Forbidden: Affiliate access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');

    // Build referrer conditions for Supabase OR query
    const referrerCodes = [
      profile.trackingCode,
      profile.customTrackingCode,
      profile.shortLinkUsername,
    ].filter(Boolean);

    if (referrerCodes.length === 0) {
      return NextResponse.json({
        success: true,
        leads: [],
        stats: { total: 0, new: 0, contacted: 0, converted: 0, conversionRate: 0 },
      });
    }

    // Build Supabase query
    let query = db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, referrerUsername, attributionMethod, convertedToClient, created_at, updated_at')
      .eq('referrerType', 'affiliate')
      .in('referrerUsername', referrerCodes)
      .order('created_at', { ascending: false });

    // Add search filter using ilike for case-insensitive search
    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
      );
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      logger.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const leadsData = (leads || []) as TaxIntakeLead[];

    // Determine lead status
    const getLeadStatus = (lead: TaxIntakeLead): string => {
      if (lead.convertedToClient) return 'converted';
      if (lead.lastContactedAt) return 'contacted';
      return 'new';
    };

    const leadsWithStatus = leadsData.map((lead) => ({
      ...lead,
      status: getLeadStatus(lead),
      fullName: `${lead.first_name} ${lead.last_name}`,
    }));

    // Filter by status if provided
    const filteredLeads =
      statusFilter && statusFilter !== 'all'
        ? leadsWithStatus.filter((lead) => lead.status === statusFilter)
        : leadsWithStatus;

    // Calculate stats
    const stats = {
      total: leadsData.length,
      new: leadsWithStatus.filter((l) => l.status === 'new').length,
      contacted: leadsWithStatus.filter((l) => l.status === 'contacted').length,
      converted: leadsWithStatus.filter((l) => l.status === 'converted').length,
      conversionRate: leadsData.length > 0
        ? Math.round((leadsWithStatus.filter((l) => l.status === 'converted').length / leadsData.length) * 100)
        : 0,
    };

    logger.info(`Fetched ${filteredLeads.length} leads for affiliate ${user.id}`);

    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching affiliate leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
