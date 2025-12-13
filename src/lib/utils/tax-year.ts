/**
 * Tax Year Utility Functions
 *
 * Provides consistent tax year calculation across the application.
 * Tax Genius Pro extended filing calendar:
 * - Dec 1 (Year X) - Dec 31 (Year X+1): Filing for Year X
 *   Example: Dec 2024 through Dec 2025 = filing for Tax Year 2024
 * - This gives clients a full year window to complete their filing
 * - Clients can also select a different year for prior-year returns
 */

/**
 * Get the current/default filing tax year
 *
 * Tax season starts in December for the current year's taxes.
 * Example: December 2025 starts the filing season for Tax Year 2024
 * The window extends all the way through December of the next year.
 *
 * @returns The tax year being filed for (e.g., 2024)
 */
export function getCurrentFilingTaxYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Always file for the previous year
  // Dec 2025 = Tax Year 2024, Jan-Dec 2026 = still Tax Year 2024 (extended window)
  // Until Dec 2026 when it switches to Tax Year 2025
  return currentYear - 1;
}

/**
 * Get a human-readable label for the tax year
 *
 * @param taxYear - Optional tax year, defaults to current filing year
 * @returns e.g., "Tax Year 2024"
 */
export function getTaxYearLabel(taxYear?: number): string {
  const year = taxYear ?? getCurrentFilingTaxYear();
  return `Tax Year ${year}`;
}

/**
 * Check if we're in tax season (primary filing period)
 * Tax season runs from December through April 15 of the following year
 *
 * @returns true if currently in primary tax season
 */
export function isTaxSeason(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const day = now.getDate();

  // December = start of tax season
  if (month === 11) return true;

  // Jan 1 - Apr 15 = peak tax season
  if (month < 3 || (month === 3 && day <= 15)) return true;

  return false;
}

/**
 * Check if a tax year is valid for filing
 * We allow filing for the last 3 years (current year - 1, - 2, - 3)
 * Example: In 2025, can file for 2024, 2023, 2022
 *
 * @param taxYear - The tax year to validate
 * @returns true if valid for filing
 */
export function isValidFilingYear(taxYear: number): boolean {
  const currentYear = new Date().getFullYear();
  const defaultYear = getCurrentFilingTaxYear(); // current year - 1

  // Allow filing for 3 years back from the default year
  return taxYear >= defaultYear - 2 && taxYear <= defaultYear;
}

/**
 * Get the default tax year for a new intake form
 * This is the same as getCurrentFilingTaxYear but with explicit naming
 *
 * @returns The default tax year for new intakes
 */
export function getDefaultIntakeTaxYear(): number {
  return getCurrentFilingTaxYear();
}

/**
 * Get available tax years for selection
 * Returns array of years the client can choose from
 * Default year is first, then prior years
 *
 * @returns Array of available tax years (e.g., [2024, 2023, 2022])
 */
export function getAvailableTaxYears(): number[] {
  const defaultYear = getCurrentFilingTaxYear();
  return [defaultYear, defaultYear - 1, defaultYear - 2];
}

/**
 * Get filing deadline for a tax year
 * Standard deadline is April 15 of the following year
 * Extended deadline is October 15 (with extension filed)
 *
 * @param taxYear - The tax year
 * @returns Object with standard and extended deadline dates
 */
export function getFilingDeadlines(taxYear: number): {
  standard: Date;
  extended: Date;
} {
  return {
    standard: new Date(`${taxYear + 1}-04-15`),
    extended: new Date(`${taxYear + 1}-10-15`),
  };
}
