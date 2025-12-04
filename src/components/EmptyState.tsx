'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export interface EmptyStateProps {
  /**
   * Icon to display (from lucide-react)
   */
  icon: LucideIcon;

  /**
   * Main heading text
   * @example "No clients yet"
   */
  title: string;

  /**
   * Descriptive text explaining the empty state
   * @example "You haven't added any clients to your account yet. Add your first client to get started."
   */
  description: string;

  /**
   * Primary action button
   */
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };

  /**
   * Secondary action (optional)
   */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };

  /**
   * Help link (optional)
   */
  helpLink?: {
    label: string;
    href: string;
  };

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show in a card
   */
  showCard?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states across the application.
 * Provides a consistent, friendly experience when lists or sections have no content.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="No clients yet"
 *   description="You haven't added any clients to your account yet."
 *   primaryAction={{
 *     label: "Add Your First Client",
 *     href: "/dashboard/tax-preparer/clients/new",
 *     icon: Plus
 *   }}
 *   helpLink={{
 *     label: "Learn about managing clients",
 *     href: "/help/clients"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  helpLink,
  size = 'md',
  showCard = true,
  className = '',
}: EmptyStateProps) {
  // Size-based styling
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'space-y-3',
    },
    md: {
      container: 'py-12',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-4',
    },
    lg: {
      container: 'py-16',
      icon: 'h-20 w-20',
      title: 'text-2xl',
      description: 'text-lg',
      spacing: 'space-y-5',
    },
  };

  const styles = sizeClasses[size];

  const content = (
    <div
      className={`flex flex-col items-center justify-center text-center ${styles.container} ${styles.spacing} ${className}`}
    >
      {/* Icon */}
      <div className="flex items-center justify-center rounded-full bg-muted p-6">
        <Icon className={`${styles.icon} text-muted-foreground`} />
      </div>

      {/* Text Content */}
      <div className={`max-w-md ${styles.spacing}`}>
        <h3 className={`font-semibold ${styles.title}`}>{title}</h3>
        <p className={`text-muted-foreground ${styles.description}`}>{description}</p>
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Primary Action */}
          {primaryAction && (
            <>
              {primaryAction.href ? (
                <Link href={primaryAction.href}>
                  <Button size={size === 'sm' ? 'sm' : 'default'} className="gap-2">
                    {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                    {primaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={primaryAction.onClick}
                  size={size === 'sm' ? 'sm' : 'default'}
                  className="gap-2"
                >
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                  {primaryAction.label}
                </Button>
              )}
            </>
          )}

          {/* Secondary Action */}
          {secondaryAction && (
            <>
              {secondaryAction.href ? (
                <Link href={secondaryAction.href}>
                  <Button variant="outline" size={size === 'sm' ? 'sm' : 'default'}>
                    {secondaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={secondaryAction.onClick}
                  variant="outline"
                  size={size === 'sm' ? 'sm' : 'default'}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Help Link */}
      {helpLink && (
        <Link
          href={helpLink.href}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          {helpLink.label}
        </Link>
      )}
    </div>
  );

  // Wrap in card if requested
  if (showCard) {
    return <Card className="w-full">{content}</Card>;
  }

  return content;
}

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
  /**
   * No clients empty state
   */
  noClients: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').Users,
    title: 'No clients yet',
    description: "You haven't added any clients to your account yet. Add your first client to get started managing their tax documents and returns.",
    primaryAction,
    helpLink: {
      label: 'Learn about managing clients',
      href: '/help/clients',
    },
  }),

  /**
   * No documents empty state
   */
  noDocuments: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').FileText,
    title: 'No documents',
    description: 'There are no documents uploaded yet. Upload documents to keep everything organized in one place.',
    primaryAction,
    helpLink: {
      label: 'Learn about document management',
      href: '/help/documents',
    },
  }),

  /**
   * No leads empty state
   */
  noLeads: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').UserPlus,
    title: 'No leads yet',
    description: "You haven't received any leads yet. Share your referral link to start getting new client leads.",
    primaryAction,
    helpLink: {
      label: 'Learn about lead generation',
      href: '/help/leads',
    },
  }),

  /**
   * No email templates empty state
   */
  noEmailTemplates: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').Mail,
    title: 'No email templates',
    description: 'Create email templates to save time when communicating with clients and leads.',
    primaryAction,
    helpLink: {
      label: 'Learn about email templates',
      href: '/help/email-templates',
    },
  }),

  /**
   * No calendar events empty state
   */
  noCalendarEvents: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').Calendar,
    title: 'No appointments scheduled',
    description: 'Your calendar is empty. Schedule appointments with clients to stay organized.',
    primaryAction,
  }),

  /**
   * No tickets/support empty state
   */
  noTickets: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').HelpCircle,
    title: 'No support tickets',
    description: 'You have no open support tickets. Need help? Create a ticket and we\'ll assist you.',
    primaryAction,
  }),

  /**
   * No results from search/filter empty state
   */
  noSearchResults: () => ({
    icon: require('lucide-react').Search,
    title: 'No results found',
    description: 'We couldn\'t find any matches for your search. Try adjusting your filters or search terms.',
    showCard: false,
  }),

  /**
   * No earnings/commissions empty state
   */
  noEarnings: () => ({
    icon: require('lucide-react').DollarSign,
    title: 'No earnings yet',
    description: 'You haven\'t earned any commissions yet. Start referring clients or completing returns to earn commissions.',
    helpLink: {
      label: 'Learn about commissions',
      href: '/help/earnings',
    },
  }),

  /**
   * No analytics data empty state
   */
  noAnalytics: () => ({
    icon: require('lucide-react').BarChart3,
    title: 'No data available',
    description: 'There isn\'t enough data to display analytics yet. Check back once you have more activity.',
    showCard: false,
  }),

  /**
   * No messages empty state
   */
  noMessages: (primaryAction?: EmptyStateProps['primaryAction']) => ({
    icon: require('lucide-react').MessageSquare,
    title: 'No messages',
    description: 'Your inbox is empty. Start a conversation with your clients or tax preparer.',
    primaryAction,
  }),
};
