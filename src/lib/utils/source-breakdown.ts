/**
 * Source Breakdown Utilities
 *
 * Utilities for creating source breakdown data for analytics charts.
 */

export interface SourceData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Helper function to create source breakdown from analytics
 *
 * @param taxGeniusLeads - Number of leads from Tax Genius
 * @param preparerLeads - Number of leads from Tax Preparers
 * @param affiliateLeads - Number of leads from Affiliates
 * @param clientReferrals - Number of leads from Client Referrals
 * @returns Array of SourceData objects with values and colors
 */
export function createSourceBreakdown(
  taxGeniusLeads: number,
  preparerLeads: number,
  affiliateLeads: number,
  clientReferrals: number
): SourceData[] {
  return [
    {
      name: 'Tax Genius',
      value: taxGeniusLeads,
      percentage: 0, // Will be calculated in component
      color: '#3b82f6', // blue
    },
    {
      name: 'Tax Preparers',
      value: preparerLeads,
      percentage: 0,
      color: '#8b5cf6', // purple
    },
    {
      name: 'Affiliates',
      value: affiliateLeads,
      percentage: 0,
      color: '#f59e0b', // orange
    },
    {
      name: 'Client Referrals',
      value: clientReferrals,
      percentage: 0,
      color: '#10b981', // green
    },
  ].filter((source) => source.value > 0); // Only show sources with data
}
