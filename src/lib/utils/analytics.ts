/**
 * Analytics utility functions
 * These are pure utility functions that can be used on both server and client
 */

export interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Create funnel stages for conversion funnel visualization
 */
export function createFunnelStages(
  clicks: number,
  leads: number,
  conversions: number,
  returnsFiled: number
): FunnelStage[] {
  const total = clicks || 1;

  return [
    {
      name: 'Clicks',
      value: clicks,
      percentage: 100,
      color: '#3b82f6', // blue
    },
    {
      name: 'Leads',
      value: leads,
      percentage: (leads / total) * 100,
      color: '#8b5cf6', // purple
    },
    {
      name: 'Conversions',
      value: conversions,
      percentage: (conversions / total) * 100,
      color: '#10b981', // green
    },
    {
      name: 'Returns Filed',
      value: returnsFiled,
      percentage: (returnsFiled / total) * 100,
      color: '#f59e0b', // yellow
    },
  ];
}
