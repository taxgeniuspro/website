/**
 * Global Search API
 * GET /api/search?q=query
 *
 * Searches across:
 * - Clients & Leads (name, email)
 * - Documents (filename)
 * - Navigation pages
 * - Settings
 * - Help articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Home,
  DollarSign,
  MessageSquare,
  HelpCircle,
  Calendar,
  Mail,
} from 'lucide-react';

// TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  role: string;
  userId: string;
  fullName?: string | null;
  email?: string | null;
  taxPreparerId?: string | null;
}

interface CRMContact {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  assignedToId?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, userId, fullName, email, taxPreparerId')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const searchTerm = query.toLowerCase();
    const results: any[] = [];

    // Search navigation pages (static)
    const navigationPages = getNavigationPages(profile.role);
    const matchingPages = navigationPages.filter(
      (page) =>
        page.title.toLowerCase().includes(searchTerm) ||
        page.description?.toLowerCase().includes(searchTerm)
    );
    results.push(...matchingPages);

    // Search clients (for preparers and admins)
    if (
      profile.role === 'tax_preparer' ||
      profile.role === 'admin' ||
      profile.role === 'admin'
    ) {
      let clientQuery = db
        .from('profiles')
        .select('id, fullName, email')
        .eq('role', 'client')
        .or(`fullName.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      // For preparers, only show their assigned clients
      if (profile.role === 'tax_preparer') {
        clientQuery = clientQuery.eq('taxPreparerId', profile.id);
      }

      const { data: clients } = await clientQuery;

      if (clients) {
        results.push(
          ...clients.map((client: any) => ({
            id: `client-${client.id}`,
            title: client.fullName || client.email || 'Unknown Client',
            description: client.email,
            category: 'clients',
            href: `/dashboard/tax-preparer/clients?clientId=${client.id}`,
          }))
        );
      }
    }

    // Search leads (for preparers and admins)
    if (
      profile.role === 'tax_preparer' ||
      profile.role === 'admin' ||
      profile.role === 'admin'
    ) {
      let leadsQuery = db
        .from('crm_contacts')
        .select('id, name, email, phone, status')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      // For preparers, only show their assigned leads
      if (profile.role === 'tax_preparer') {
        leadsQuery = leadsQuery.eq('assignedToId', profile.id);
      }

      const { data: leads } = await leadsQuery;

      if (leads) {
        results.push(
          ...leads.map((lead: any) => ({
            id: `lead-${lead.id}`,
            title: lead.name,
            description: `${lead.email} - ${lead.status}`,
            category: 'clients',
            href: `/dashboard/tax-preparer/leads?leadId=${lead.id}`,
          }))
        );
      }
    }

    // Limit total results
    const limitedResults = results.slice(0, 20);

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    logger.error('Search error', { error });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

/**
 * Get navigation pages based on user role
 */
function getNavigationPages(role: string) {
  const commonPages = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Overview and quick actions',
      category: 'navigation',
      href: '/dashboard',
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Account preferences and configuration',
      category: 'settings',
      href: `/dashboard/${role.toLowerCase()}/settings`,
    },
  ];

  const roleSpecificPages: Record<string, any[]> = {
    TAX_PREPARER: [
      {
        id: 'nav-clients',
        title: 'Clients',
        description: 'Manage your clients',
        category: 'navigation',
        href: '/dashboard/tax-preparer/clients',
      },
      {
        id: 'nav-leads',
        title: 'Leads',
        description: 'Manage potential clients',
        category: 'navigation',
        href: '/dashboard/tax-preparer/leads',
      },
      {
        id: 'nav-documents',
        title: 'Documents',
        description: 'Client documents and forms',
        category: 'documents',
        href: '/dashboard/tax-preparer/documents',
      },
      {
        id: 'nav-analytics',
        title: 'Analytics',
        description: 'Performance metrics and insights',
        category: 'navigation',
        href: '/dashboard/tax-preparer/analytics',
      },
      {
        id: 'nav-earnings',
        title: 'Earnings',
        description: 'Track your commissions',
        category: 'navigation',
        href: '/dashboard/tax-preparer/earnings',
      },
      {
        id: 'nav-email-templates',
        title: 'Email Templates',
        description: 'Manage email templates',
        category: 'navigation',
        href: '/dashboard/tax-preparer/email-templates',
      },
    ],
    AFFILIATE: [
      {
        id: 'nav-leads',
        title: 'Leads',
        description: 'Track your referrals',
        category: 'navigation',
        href: '/dashboard/affiliate/leads',
      },
      {
        id: 'nav-marketing',
        title: 'Marketing Materials',
        description: 'Download marketing assets',
        category: 'navigation',
        href: '/dashboard/affiliate/marketing',
      },
      {
        id: 'nav-analytics',
        title: 'Analytics',
        description: 'Performance metrics',
        category: 'navigation',
        href: '/dashboard/affiliate/analytics',
      },
      {
        id: 'nav-earnings',
        title: 'Earnings',
        description: 'Track your commissions',
        category: 'navigation',
        href: '/dashboard/affiliate/earnings',
      },
    ],
    CLIENT: [
      {
        id: 'nav-documents',
        title: 'Documents',
        description: 'Your tax documents',
        category: 'documents',
        href: '/dashboard/client/documents',
      },
      {
        id: 'nav-returns',
        title: 'Tax Returns',
        description: 'View your tax returns',
        category: 'navigation',
        href: '/dashboard/client/returns',
      },
      {
        id: 'nav-messages',
        title: 'Messages',
        description: 'Chat with your tax preparer',
        category: 'navigation',
        href: '/dashboard/client/messages',
      },
      {
        id: 'nav-support',
        title: 'Ask Your Tax Genius',
        description: 'Get help and support',
        category: 'help',
        href: '/dashboard/client/tickets',
      },
    ],
    ADMIN: [
      {
        id: 'nav-users',
        title: 'User Management',
        description: 'Manage all users',
        category: 'navigation',
        href: '/admin/users',
      },
      {
        id: 'nav-analytics',
        title: 'Analytics',
        description: 'Platform analytics',
        category: 'navigation',
        href: '/admin/analytics',
      },
      {
        id: 'nav-payouts',
        title: 'Payouts',
        description: 'Manage commission payouts',
        category: 'navigation',
        href: '/admin/payouts',
      },
      {
        id: 'nav-clients-status',
        title: 'Client Status',
        description: 'Monitor all clients',
        category: 'navigation',
        href: '/admin/clients-status',
      },
      {
        id: 'nav-leads',
        title: 'Leads',
        description: 'Manage all leads',
        category: 'navigation',
        href: '/admin/leads',
      },
    ],
  };

  return [...commonPages, ...(roleSpecificPages[role] || [])];
}
