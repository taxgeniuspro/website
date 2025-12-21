'use client';

/**
 * Mobile Card List Component
 *
 * Responsive list that shows as table on desktop and cards on mobile.
 * Perfect for leads, clients, referrals lists.
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  mobileHidden?: boolean;
  mobileLabel?: string;
}

interface MobileCardListProps<T> {
  items: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onItemClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  cardClassName?: string;
}

export function MobileCardList<T extends Record<string, any>>({
  items,
  columns,
  keyExtractor,
  onItemClick,
  emptyMessage = 'No items found',
  emptyIcon,
  loading,
  className,
  cardClassName,
}: MobileCardListProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className={cn('animate-pulse', cardClassName)}>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {emptyIcon && <div className="mb-4 opacity-50">{emptyIcon}</div>}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Get value from nested path like "user.name"
  const getValue = (item: T, key: string): any => {
    return key.split('.').reduce((obj, k) => obj?.[k], item);
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className={cn('hidden md:block', className)}>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key.toString()}
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                  >
                    {col.header}
                  </th>
                ))}
                {onItemClick && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={cn(
                    'hover:bg-muted/50 transition-colors',
                    onItemClick && 'cursor-pointer'
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key.toString()} className="px-4 py-3 text-sm">
                      {col.render
                        ? col.render(item)
                        : getValue(item, col.key.toString())}
                    </td>
                  ))}
                  {onItemClick && (
                    <td className="px-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className={cn('md:hidden space-y-3', className)}>
        {items.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={cn(
              'overflow-hidden',
              onItemClick && 'cursor-pointer active:bg-muted/50',
              cardClassName
            )}
            onClick={() => onItemClick?.(item)}
          >
            <CardContent className="p-4">
              {/* Primary content - first 2 visible columns */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {columns
                    .filter((col) => !col.mobileHidden)
                    .slice(0, 2)
                    .map((col, idx) => (
                      <div
                        key={col.key.toString()}
                        className={cn(
                          idx === 0 ? 'font-medium truncate' : 'text-sm text-muted-foreground'
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : getValue(item, col.key.toString())}
                      </div>
                    ))}
                </div>
                {onItemClick && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </div>

              {/* Secondary content - remaining visible columns */}
              <div className="flex flex-wrap gap-2 mt-2">
                {columns
                  .filter((col) => !col.mobileHidden)
                  .slice(2)
                  .map((col) => {
                    const value = col.render
                      ? col.render(item)
                      : getValue(item, col.key.toString());

                    if (!value) return null;

                    return (
                      <div key={col.key.toString()} className="text-xs text-muted-foreground">
                        {col.mobileLabel && (
                          <span className="font-medium">{col.mobileLabel}: </span>
                        )}
                        {value}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
