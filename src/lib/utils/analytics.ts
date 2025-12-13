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

  // Tax Genius Pro brand colors:
  // Primary: Yellow (#f9d938)
  // Secondary: Green (#408851)
  // Accent: Dark blue-gray (#30394b)
  return [
    {
      name: 'Clicks',
      value: clicks,
      percentage: 100,
      color: '#f9d938', // Brand primary yellow
    },
    {
      name: 'Leads',
      value: leads,
      percentage: (leads / total) * 100,
      color: '#30394b', // Brand accent dark blue-gray
    },
    {
      name: 'Conversions',
      value: conversions,
      percentage: (conversions / total) * 100,
      color: '#408851', // Brand secondary green
    },
    {
      name: 'Returns Filed',
      value: returnsFiled,
      percentage: (returnsFiled / total) * 100,
      color: '#d97706', // Amber-600 (warm gold variant)
    },
  ];
}
