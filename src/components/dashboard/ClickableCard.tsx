'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ClickableCardProps {
  /**
   * Card title
   */
  title: string;

  /**
   * Main value to display
   */
  value: string | number;

  /**
   * Optional subtitle or description
   */
  subtitle?: string;

  /**
   * Icon component
   */
  icon?: React.ElementType;

  /**
   * Link destination when clicked
   */
  href: string;

  /**
   * Optional trend indicator
   */
  trend?: {
    value: number;
    label: string;
  };

  /**
   * Optional badge text
   */
  badge?: string;

  /**
   * Color variant
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';

  /**
   * Whether card is loading
   */
  loading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ClickableCard Component
 *
 * Interactive stat card for dashboards that navigates on click.
 * Provides clear visual feedback and hover states.
 *
 * Features:
 * - Clickable with proper hover states
 * - Keyboard accessible (Enter/Space to activate)
 * - Visual feedback on interaction
 * - Trend indicators
 * - Icon support
 * - Color variants
 *
 * Best Practices:
 * - Uses Link for proper navigation
 * - Hover states indicate interactivity
 * - Accessible (role, keyboard navigation)
 * - Smooth transitions
 *
 * @example
 * ```tsx
 * <ClickableCard
 *   title="Total Clients"
 *   value={145}
 *   subtitle="Active clients"
 *   icon={Users}
 *   href="/dashboard/tax-preparer/clients"
 *   trend={{ value: 12, label: "vs last month" }}
 *   variant="primary"
 * />
 * ```
 */
export function ClickableCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  trend,
  badge,
  variant = 'default',
  loading = false,
  className,
}: ClickableCardProps) {
  const variantStyles = {
    default: 'hover:border-primary/50',
    primary: 'border-primary/20 hover:border-primary/50 bg-primary/5',
    success: 'border-green-200 hover:border-green-400 bg-green-50 dark:bg-green-950/20',
    warning: 'border-yellow-200 hover:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20',
    danger: 'border-red-200 hover:border-red-400 bg-red-50 dark:bg-red-950/20',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          'transition-all duration-200 cursor-pointer',
          'hover:shadow-md hover:-translate-y-0.5',
          'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
          variantStyles[variant],
          className
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {/* Left Side - Text Content */}
            <div className="flex-1 space-y-1">
              {/* Title */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                {badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {badge}
                  </span>
                )}
              </div>

              {/* Value */}
              {loading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold">{value}</p>
              )}

              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}

              {/* Trend Indicator */}
              {trend && !loading && (
                <div className="flex items-center gap-1 pt-1">
                  {trend.value > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : trend.value < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : null}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.value > 0 && 'text-green-600',
                      trend.value < 0 && 'text-red-600',
                      trend.value === 0 && 'text-muted-foreground'
                    )}
                  >
                    {trend.value > 0 && '+'}
                    {trend.value}% {trend.label}
                  </span>
                </div>
              )}
            </div>

            {/* Right Side - Icon & Arrow */}
            <div className="flex flex-col items-end gap-2">
              {Icon && (
                <div className={cn('p-3 rounded-full bg-background', iconColors[variant])}>
                  <Icon className="h-6 w-6" />
                </div>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * ClickableCardGrid Component
 *
 * Grid wrapper for ClickableCard components with responsive layout.
 */
export function ClickableCardGrid({
  children,
  columns = 4,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={cn('grid gap-4', gridCols[columns])}>{children}</div>;
}
