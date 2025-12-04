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
import { prisma } from '@/lib/db';
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

    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
    });

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
      profile.role === 'TAX_PREPARER' ||
      profile.role === 'ADMIN' ||
      profile.role === 'SUPER_ADMIN'
    ) {
      const clients = await prisma.profile.findMany({
        where: {
          AND: [
            { role: 'client' },
            {
              OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
          // For preparers, only show their assigned clients
          ...(profile.role === 'TAX_PREPARER'
            ? [{ taxPreparerId: profile.id }]
            : []),
        },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

      results.push(
        ...clients.map((client) => ({
          id: `client-${client.id}`,
          title: client.fullName || client.email || 'Unknown Client',
          description: client.email,
          category: 'clients',
          href: `/dashboard/tax-preparer/clients?clientId=${client.id}`,
        }))
      );
    }

    // Search leads (for preparers and admins)
    if (
      profile.role === 'TAX_PREPARER' ||
      profile.role === 'ADMIN' ||
      profile.role === 'SUPER_ADMIN'
    ) {
      const leads = await prisma.cRMContact.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
          // For preparers, only show their assigned leads
          ...(profile.role === 'TAX_PREPARER'
            ? [{ assignedToId: profile.id }]
            : []),
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });

      results.push(
        ...leads.map((lead) => ({
          id: `lead-${lead.id}`,
          title: lead.name,
          description: `${lead.email} • ${lead.status}`,
          category: 'clients',
          href: `/dashboard/tax-preparer/leads?leadId=${lead.id}`,
        }))
      );
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
