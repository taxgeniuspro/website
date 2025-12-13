/**
 * Tax Year Utility Functions
 *
 * Provides consistent tax year calculation across the application.
 * Tax filing follows IRS calendar:
 * - Jan 1 - Apr 15: Filing previous year (e.g., April 2025 = filing 2024)
 * - Apr 16 - Dec 31: Filing current year (e.g., Dec 2025 = filing 2025)
 */

/**
 * Get the current filing tax year based on IRS filing calendar
 *
 * @returns The tax year being filed for (e.g., 2024)
 */
export function getCurrentFilingTaxYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
  const day = now.getDate();

  // Jan 1 - Apr 15: Filing previous year
  if (month < 3 || (month === 3 && day <= 15)) {
    return currentYear - 1;
  }

  // Apr 16 - Dec 31: Filing current year
  return currentYear;
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
 * Check if we're in early filing season (Jan 1 - Apr 15)
 * During this time, most people are filing for the previous year
 *
 * @returns true if currently in early filing season
 */
export function isEarlyFilingSeason(): boolean {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return month < 3 || (month === 3 && day <= 15);
}

/**
 * Check if a tax year is valid for filing
 * Valid years are current year and previous year only
 *
 * @param taxYear - The tax year to validate
 * @returns true if valid for filing
 */
export function isValidFilingYear(taxYear: number): boolean {
  const currentYear = new Date().getFullYear();
  return taxYear === currentYear || taxYear === currentYear - 1;
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
