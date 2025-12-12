'use client';

import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  mobileCell?: (item: T) => ReactNode; // Custom mobile rendering
  hideOnMobile?: boolean;
  className?: string;
}

export interface MobileCardConfig<T> {
  avatar?: (item: T) => ReactNode;
  title: (item: T) => ReactNode;
  subtitle?: (item: T) => ReactNode;
  badge?: (item: T) => ReactNode;
  meta?: (item: T) => ReactNode;
  actions?: (item: T) => ReactNode;
}

interface ResponsiveDataListProps<T> {
  data: T[];
  columns: Column<T>[];
  mobileCard?: MobileCardConfig<T>;
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  loadingRows?: number;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function ResponsiveDataList<T>({
  data,
  columns,
  mobileCard,
  keyExtractor,
  isLoading = false,
  loadingRows = 5,
  emptyState,
  onRowClick,
  className,
}: ResponsiveDataListProps<T>) {
  const isMobile = useIsMobile();

  // Loading state
  if (isLoading) {
    if (isMobile && mobileCard) {
      return (
        <div className={cn('space-y-3', className)}>
          {Array.from({ length: loadingRows }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns
                .filter((col) => !col.hideOnMobile || !isMobile)
                .map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={i}>
                {columns
                  .filter((col) => !col.hideOnMobile || !isMobile)
                  .map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        {emptyState || (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </div>
    );
  }

  // Mobile card view
  if (isMobile && mobileCard) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={cn(
              'overflow-hidden transition-colors',
              onRowClick && 'cursor-pointer active:bg-muted/50'
            )}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {mobileCard.avatar && (
                  <div className="flex-shrink-0">{mobileCard.avatar(item)}</div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header row with title and badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm truncate">
                      {mobileCard.title(item)}
                    </div>
                    {mobileCard.badge && (
                      <div className="flex-shrink-0">{mobileCard.badge(item)}</div>
                    )}
                  </div>

                  {/* Subtitle */}
                  {mobileCard.subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {mobileCard.subtitle(item)}
                    </div>
                  )}

                  {/* Meta info */}
                  {mobileCard.meta && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {mobileCard.meta(item)}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {mobileCard.actions && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                  {mobileCard.actions(item)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns
              .filter((col) => !col.hideOnMobile || !isMobile)
              .map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={cn(onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(item)}
            >
              {columns
                .filter((col) => !col.hideOnMobile || !isMobile)
                .map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {isMobile && column.mobileCell
                      ? column.mobileCell(item)
                      : column.cell(item)}
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
