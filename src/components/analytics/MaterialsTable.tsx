/**
 * Materials Table Component
 *
 * Displays Top 15 materials with performance metrics
 * Supports sorting, filtering, and export
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

'use client';

import { useState } from 'react';
import { useMyTopMaterials } from '@/hooks/useMyMaterials';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Eye } from 'lucide-react';
import { ExportButton } from './ExportButton';

interface MaterialsTableProps {
  limit?: number;
  dateRange?: string;
  onViewMaterial?: (materialId: string) => void;
}

export function MaterialsTable({
  limit = 15,
  dateRange = 'all',
  onViewMaterial,
}: MaterialsTableProps) {
  const [sortBy, setSortBy] = useState('returnsFiled');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useMyTopMaterials({
    limit,
    sortBy,
    sortOrder,
    dateRange,
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load materials. Please try again.</p>
      </div>
    );
  }

  const materials = data?.materials || [];

  if (materials.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No materials found. Create your first material to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {limit === 15 ? 'Top 15 Materials' : `Top ${limit} Materials`}
        </h3>
        <ExportButton
          data={materials.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.type,
            location: m.location || '',
            clicks: m.metrics.clicks,
            intakeStarts: m.metrics.intakeStarts,
            intakeCompletes: m.metrics.intakeCompletes,
            returnsFiled: m.metrics.returnsFiled,
            conversionRate: m.metrics.conversionRate,
            intakeConversionRate: m.metrics.intakeConversionRate,
            completeConversionRate: m.metrics.completeConversionRate,
            filedConversionRate: m.metrics.filedConversionRate,
            lastActivity: m.lastActivity,
            createdAt: m.createdAt,
          }))}
          type="materials"
          dateRange={dateRange}
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Material Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('clicks')}
                  className="h-8"
                >
                  Clicks
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Started</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('returnsFiled')}
                  className="h-8"
                >
                  Filed
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('conversionRate')}
                  className="h-8"
                >
                  Rate
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material, idx) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {idx < 3 && (
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{material.title}</span>
                      {material.campaignName && (
                        <span className="text-xs text-muted-foreground">
                          {material.campaignName}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formatMaterialType(material.type)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                  {material.location || 'Not specified'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {material.metrics.clicks.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {material.metrics.intakeStarts.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {material.metrics.intakeCompletes.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {material.metrics.returnsFiled.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      material.metrics.conversionRate > 10
                        ? 'default'
                        : material.metrics.conversionRate > 5
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {material.metrics.conversionRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={material.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {material.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewMaterial?.(material.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Showing {materials.length} of {data.pagination.total} materials
          </span>
          {/* TODO: Add pagination controls */}
        </div>
      )}
    </div>
  );
}

function formatMaterialType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Started</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Filed</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
