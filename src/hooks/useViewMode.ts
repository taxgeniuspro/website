'use client';

import { useContext, createContext } from 'react';

// Re-export from context for convenience
export { useViewModeContext as useViewMode } from '@/context/ViewModeContext';
export type { ViewMode } from '@/context/ViewModeContext';

/**
 * Hook to check if specific data types should be hidden based on view mode
 *
 * Usage:
 * const { shouldHideTaxData, shouldShowAffiliateData } = useDataVisibility();
 *
 * {!shouldHideTaxData && <TaxStatusBadge />}
 * {shouldShowAffiliateData && <ReferralStats />}
 */
export function useDataVisibility() {
  // This hook can be used standalone without context if needed
  // For now, it provides helper functions for common visibility checks

  return {
    // Tax-related data that should be hidden in affiliate-only mode
    taxDataFields: [
      'taxFilingStatus',
      'taxYear',
      'taxDocuments',
      'ssn',
      'dateOfBirth',
      'income',
      'dependents',
      'refundAmount',
      'oweAmount',
      'returnProgress',
      'intakeDetails',
      'documentCount',
    ] as const,

    // Affiliate-related data that should always be shown
    affiliateDataFields: [
      'name',
      'email',
      'phone',
      'referralCount',
      'conversionRate',
      'commissionEarnings',
      'trackingCode',
      'referralLinks',
      'leadSource',
      'joinDate',
    ] as const,
  };
}
