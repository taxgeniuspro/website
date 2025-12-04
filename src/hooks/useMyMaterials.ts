/**
 * React Query Hooks for Material Performance Analytics
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// ============ Types ============

export interface MaterialPerformance {
  id: string;
  title: string;
  type: string;
  location: string | null;
  campaignName: string | null;
  metrics: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversionRate: number;
  };
  lastActivity: Date | null;
  status: 'ACTIVE' | 'PAUSED';
  earnings?: number;
}

export interface ConversionFunnelData {
  funnel: {
    stage1_clicks: number;
    stage2_intakeStarts: number;
    stage3_intakeCompletes: number;
    stage4_returnsFiled: number;
    dropoff: {
      clickToStart: number;
      startToComplete: number;
      completeToFiled: number;
    };
    conversionRates: {
      clickToStart: number;
      startToComplete: number;
      completeToFiled: number;
      overallConversion: number;
    };
  };
  dateRange: {
    start: string;
    end: string;
  };
}

export interface SourceBreakdownData {
  byType: Array<{
    type: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    earnings?: number;
  }>;
  byCampaign: Array<{
    campaign: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  summary: {
    totalMaterials: number;
    totalClicks: number;
    totalConversions: number;
    averageConversionRate: number;
    bestPerformingType: string;
    bestPerformingCampaign: string;
  };
}

// ============ Hooks ============

/**
 * Fetch user's top performing materials
 *
 * @param options - Query options (limit, sortBy, dateRange, pagination)
 * @returns React Query result with materials array and pagination
 */
export function useMyTopMaterials(options?: {
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  dateRange?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['my-materials', userId, options],
    queryFn: async (): Promise<{
      materials: MaterialPerformance[];
      pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }> => {
      const params = new URLSearchParams();

      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.sortBy) params.set('sortBy', options.sortBy);
      if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
      if (options?.dateRange) params.set('dateRange', options.dateRange);
      if (options?.page) params.set('page', options.page.toString());
      if (options?.pageSize) params.set('pageSize', options.pageSize.toString());

      const response = await fetch(`/api/materials/my-performance?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      return response.json();
    },
    staleTime: 30000, // 30 seconds
    enabled: !!userId,
  });
}

/**
 * Fetch conversion funnel data for user's materials
 *
 * @param options - Query options (dateRange, materialId)
 * @returns React Query result with funnel data
 */
export function useConversionFunnel(options?: { dateRange?: string; materialId?: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['conversion-funnel', userId, options],
    queryFn: async (): Promise<ConversionFunnelData> => {
      const params = new URLSearchParams();

      if (options?.dateRange) params.set('dateRange', options.dateRange);
      if (options?.materialId) params.set('materialId', options.materialId);

      const response = await fetch(`/api/analytics/funnel/${userId}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch funnel');
      }

      return response.json();
    },
    staleTime: 60000, // 1 minute
    enabled: !!userId,
  });
}

/**
 * Fetch source breakdown analytics (by type, campaign, location)
 *
 * @param options - Query options (dateRange)
 * @returns React Query result with source breakdown data
 */
export function useSourceBreakdown(options?: { dateRange?: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['source-breakdown', userId, options],
    queryFn: async (): Promise<SourceBreakdownData> => {
      const params = new URLSearchParams();

      if (options?.dateRange) params.set('dateRange', options.dateRange);

      const response = await fetch(`/api/analytics/source-breakdown?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch source breakdown');
      }

      return response.json();
    },
    staleTime: 60000, // 1 minute
    enabled: !!userId,
  });
}

/**
 * Helper: Prefetch materials for faster navigation
 */
export function usePrefetchMaterials() {
  // TODO: Implement prefetching for pagination
  return null;
}
