/**
 * Federal Tax Calculator
 * Calculates federal income tax based on IRS tax brackets and credits
 */

import {
  TAX_BRACKETS_2024,
  STANDARD_DEDUCTION_2024,
  CHILD_TAX_CREDIT_2024,
  EITC_2024,
} from './tax-brackets-2024';
import {
  TAX_BRACKETS_2025,
  STANDARD_DEDUCTION_2025,
  CHILD_TAX_CREDIT_2025,
  EITC_2025,
} from './tax-brackets-2025';

export type FilingStatus = 'single' | 'marriedJoint' | 'marriedSeparate' | 'headOfHousehold';

export interface TaxCalculationParams {
  taxYear: 2024 | 2025;
  filingStatus: FilingStatus;
  wages: number;
  otherIncome: number;
  adjustments: number;
  itemizedDeductions?: number;
  dependents: number;
  withholding: number;
}

export interface BracketBreakdown {
  rate: number;
  income: number;
  tax: number;
}

export interface TaxCalculationResult {
  // Income
  totalIncome: number;
  agi: number;
  standardDeduction: number;
  totalDeductions: number;
  taxableIncome: number;

  // Tax
  incomeTax: number;
  bracketBreakdown: BracketBreakdown[];
  effectiveRate: number;
  marginalRate: number;

  // Credits
  childTaxCredit: number;
  eitc: number;
  totalCredits: number;

  // Final
  totalTaxLiability: number;
  withholding: number;
  refundOrOwed: number;
}

/**
 * Get tax data for specific year
 */
function getTaxData(taxYear: 2024 | 2025) {
  if (taxYear === 2024) {
    return {
      brackets: TAX_BRACKETS_2024,
      standardDeduction: STANDARD_DEDUCTION_2024,
      childTaxCredit: CHILD_TAX_CREDIT_2024,
      eitc: EITC_2024,
    };
  } else {
    return {
      brackets: TAX_BRACKETS_2025,
      standardDeduction: STANDARD_DEDUCTION_2025,
      childTaxCredit: CHILD_TAX_CREDIT_2025,
      eitc: EITC_2025,
    };
  }
}

/**
 * Calculate income tax using progressive brackets
 */
function calculateIncomeTax(
  taxableIncome: number,
  brackets: Array<{ rate: number; min: number; max: number }>
) {
  let totalTax = 0;
  let remainingIncome = taxableIncome;
  const breakdown: BracketBreakdown[] = [];

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketSize =
      bracket.max === Infinity
        ? remainingIncome
        : Math.min(bracket.max - bracket.min + 1, remainingIncome);

    const taxableInBracket = Math.min(bracketSize, remainingIncome);
    const taxInBracket = taxableInBracket * bracket.rate;

    if (taxableInBracket > 0) {
      breakdown.push({
        rate: bracket.rate,
        income: taxableInBracket,
        tax: taxInBracket,
      });
      totalTax += taxInBracket;
      remainingIncome -= taxableInBracket;
    }
  }

  return { totalTax, breakdown };
}

/**
 * Calculate Child Tax Credit
 */
function calculateChildTaxCredit(
  dependents: number,
  agi: number,
  filingStatus: FilingStatus,
  creditData: typeof CHILD_TAX_CREDIT_2024
): number {
  if (dependents === 0) return 0;

  const { maxCredit, phaseOutSingle, phaseOutMarried, phaseOutRate } = creditData;
  const phaseOutThreshold = filingStatus === 'marriedJoint' ? phaseOutMarried : phaseOutSingle;

  let credit = dependents * maxCredit;

  // Phase out credit if over income limit
  if (agi > phaseOutThreshold) {
    const excessIncome = agi - phaseOutThreshold;
    const reduction = Math.ceil(excessIncome / 1000) * (phaseOutRate * 1000);
    credit = Math.max(0, credit - reduction);
  }

  return credit;
}

/**
 * Calculate Earned Income Tax Credit (EITC)
 */
function calculateEITC(
  agi: number,
  dependents: number,
  filingStatus: FilingStatus,
  eitcData: typeof EITC_2024
): number {
  const isMarried = filingStatus === 'marriedJoint';

  let creditInfo;
  if (dependents === 0) {
    creditInfo = eitcData.noChildren;
  } else if (dependents === 1) {
    creditInfo = eitcData.oneChild;
  } else if (dependents === 2) {
    creditInfo = eitcData.twoChildren;
  } else {
    creditInfo = eitcData.threeOrMore;
  }

  const incomeLimit = isMarried ? creditInfo.incomeLimitMarried : creditInfo.incomeLimitSingle;

  // Check if income is within limits
  if (agi > incomeLimit) {
    return 0;
  }

  // Simplified EITC calculation
  // In reality, EITC has a phase-in and phase-out calculation
  // This is a simplified version that returns max credit if under limit
  const phaseOutStart = incomeLimit * 0.7; // Simplified assumption

  if (agi <= phaseOutStart) {
    return creditInfo.maxCredit;
  } else {
    // Phase out linearly
    const phaseOutRange = incomeLimit - phaseOutStart;
    const excessIncome = agi - phaseOutStart;
    const phaseOutPercentage = excessIncome / phaseOutRange;
    return creditInfo.maxCredit * (1 - phaseOutPercentage);
  }
}

/**
 * Main tax calculation function
 */
export function calculateFederalTax(params: TaxCalculationParams): TaxCalculationResult {
  const {
    taxYear,
    filingStatus,
    wages,
    otherIncome,
    adjustments,
    itemizedDeductions,
    dependents,
    withholding,
  } = params;

  // Get tax data for the year
  const taxData = getTaxData(taxYear);
  const brackets = taxData.brackets[filingStatus];
  const standardDeduction = taxData.standardDeduction[filingStatus];

  // Step 1: Calculate Total Income
  const totalIncome = wages + otherIncome;

  // Step 2: Calculate AGI (Adjusted Gross Income)
  const agi = Math.max(0, totalIncome - adjustments);

  // Step 3: Calculate Deductions
  const useItemized = itemizedDeductions && itemizedDeductions > standardDeduction;
  const totalDeductions = useItemized ? itemizedDeductions : standardDeduction;

  // Step 4: Calculate Taxable Income
  const taxableIncome = Math.max(0, agi - totalDeductions);

  // Step 5: Calculate Income Tax
  const { totalTax: incomeTax, breakdown: bracketBreakdown } = calculateIncomeTax(
    taxableIncome,
    brackets
  );

  // Step 6: Calculate Effective and Marginal Tax Rates
  const effectiveRate = agi > 0 ? (incomeTax / agi) * 100 : 0;
  const marginalRate =
    bracketBreakdown.length > 0 ? bracketBreakdown[bracketBreakdown.length - 1].rate * 100 : 0;

  // Step 7: Calculate Tax Credits
  const childTaxCredit = calculateChildTaxCredit(
    dependents,
    agi,
    filingStatus,
    taxData.childTaxCredit
  );
  const eitc = calculateEITC(agi, dependents, filingStatus, taxData.eitc);
  const totalCredits = childTaxCredit + eitc;

  // Step 8: Calculate Final Tax Liability
  const totalTaxLiability = Math.max(0, incomeTax - totalCredits);

  // Step 9: Calculate Refund or Amount Owed
  const refundOrOwed = withholding - totalTaxLiability;

  return {
    totalIncome,
    agi,
    standardDeduction,
    totalDeductions,
    taxableIncome,
    incomeTax,
    bracketBreakdown,
    effectiveRate,
    marginalRate,
    childTaxCredit,
    eitc,
    totalCredits,
    totalTaxLiability,
    withholding,
    refundOrOwed,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(rate: number, decimals: number = 1): string {
  return `${rate.toFixed(decimals)}%`;
}
