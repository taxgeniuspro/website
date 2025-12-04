'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Route Label Mappings
 * Maps route segments to human-readable labels
 */
const ROUTE_LABELS: Record<string, string> = {
  // Dashboard
  dashboard: 'Dashboard',

  // Roles
  'tax-preparer': 'Tax Preparer',
  affiliate: 'Affiliate',
  client: 'Client',
  admin: 'Admin',
  lead: 'Lead',

  // Features
  overview: 'Overview',
  clients: 'Clients',
  leads: 'Leads',
  documents: 'Documents',
  earnings: 'Earnings',
  analytics: 'Analytics',
  tracking: 'Tracking',
  marketing: 'Marketing Materials',
  achievements: 'Achievements',
  settings: 'Settings',
  tickets: 'Support Tickets',
  'tax-forms': 'Tax Forms',
  messages: 'Messages',
  calendar: 'Calendar',
  returns: 'Tax Returns',
  referrals: 'Referrals',

  // Admin sections
  users: 'User Management',
  payouts: 'Payouts',
  'clients-status': 'Client Status',
  database: 'Database',
  'address-book': 'Address Book',
  emails: 'Email Center',
  'file-center': 'File Center',
  'learning-center': 'Learning Center',
  'marketing-hub': 'Marketing Hub',
  'content-generator': 'Content Generator',
  'quick-share': 'Quick Share',
  permissions: 'Permissions',
  'referrals-status': 'Referrals Status',

  // Store
  store: 'Store',
  cart: 'Shopping Cart',
  'professional-email': 'Professional Email',

  // Email
  'email-templates': 'Email Templates',

  // Auth
  auth: 'Authentication',
  login: 'Login',
  signup: 'Sign Up',
  'verify-email': 'Verify Email',

  // Public pages
  services: 'Services',
  about: 'About Us',
  contact: 'Contact',
  blog: 'Blog',
  help: 'Help Center',
  'personal-tax-filing': 'Personal Tax Filing',
  'business-tax': 'Business Tax',
  'tax-planning': 'Tax Planning',
  'audit-protection': 'Audit Protection',
  'irs-resolution': 'IRS Resolution',
  preparer: 'Become a Preparer',
  referral: 'Referral Program',
};

interface BreadcrumbsProps {
  /**
   * Optional custom breadcrumb items to override auto-generated ones
   */
  items?: Array<{
    label: string;
    href?: string;
  }>;

  /**
   * Hide the home icon
   */
  hideHome?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Breadcrumbs Component
 *
 * Automatically generates breadcrumbs based on the current route,
 * or accepts custom breadcrumb items.
 *
 * Features:
 * - Auto-generates from URL path
 * - Human-readable labels
 * - Keyboard navigation support
 * - Responsive design (hides on mobile by default)
 * - Accessible (ARIA labels, semantic markup)
 *
 * @example
 * ```tsx
 * // Auto-generated from URL
 * <Breadcrumbs />
 *
 * // Custom items
 * <Breadcrumbs
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Client Details' }
 *   ]}
 * />
 * ```
 */
export function Breadcrumbs({ items, hideHome = false, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  // Don't show breadcrumbs if we're on the home page or only have one item
  if (breadcrumbItems.length <= 1 && !items) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('hidden md:flex items-center space-x-1 text-sm text-muted-foreground mb-4', className)}
    >
      <ol className="flex items-center space-x-1">
        {/* Home link */}
        {!hideHome && (
          <>
            <li>
              <Link
                href="/"
                className="flex items-center hover:text-foreground transition-colors"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
            )}
          </>
        )}

        {/* Breadcrumb items */}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={index} className="flex items-center space-x-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors max-w-[150px] truncate"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'max-w-[150px] truncate',
                    isLast && 'text-foreground font-medium'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="h-4 w-4" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumb items from pathname
 */
function generateBreadcrumbsFromPath(pathname: string) {
  // Remove leading/trailing slashes and split
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const items = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip dynamic route segments (IDs, UUIDs, etc.)
    if (isDynamicSegment(segment)) {
      continue;
    }

    // Get label from mapping or format the segment
    const label = ROUTE_LABELS[segment] || formatSegment(segment);

    // Only add href if not the last item
    items.push({
      label,
      href: i < segments.length - 1 ? currentPath : undefined,
    });
  }

  return items;
}

/**
 * Check if segment is a dynamic route (ID, UUID, etc.)
 */
function isDynamicSegment(segment: string): boolean {
  // Check for UUIDs, numeric IDs, or other patterns that look like IDs
  const patterns = [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^\d+$/, // Numeric ID
    /^clk_[a-zA-Z0-9]+$/, // Clerk ID
    /^[a-zA-Z0-9]{20,}$/, // Long random string
  ];

  return patterns.some(pattern => pattern.test(segment));
}

/**
 * Format segment into human-readable label
 */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
