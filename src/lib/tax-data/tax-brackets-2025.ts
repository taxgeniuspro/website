/**
 * 2025 Federal Tax Data
 * Source: IRS Revenue Procedure 2024-40
 * https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025
 */

import { TaxBracket } from './tax-brackets-2024';

export const TAX_BRACKETS_2025 = {
  single: [
    { rate: 0.1, min: 0, max: 11925 },
    { rate: 0.12, min: 11926, max: 48475 },
    { rate: 0.22, min: 48476, max: 103350 },
    { rate: 0.24, min: 103351, max: 197300 },
    { rate: 0.32, min: 197301, max: 250525 },
    { rate: 0.35, min: 250526, max: 626350 },
    { rate: 0.37, min: 626351, max: Infinity },
  ],
  marriedJoint: [
    { rate: 0.1, min: 0, max: 23850 },
    { rate: 0.12, min: 23851, max: 96950 },
    { rate: 0.22, min: 96951, max: 206700 },
    { rate: 0.24, min: 206701, max: 394600 },
    { rate: 0.32, min: 394601, max: 501050 },
    { rate: 0.35, min: 501051, max: 751600 },
    { rate: 0.37, min: 751601, max: Infinity },
  ],
  marriedSeparate: [
    { rate: 0.1, min: 0, max: 11925 },
    { rate: 0.12, min: 11926, max: 48475 },
    { rate: 0.22, min: 48476, max: 103350 },
    { rate: 0.24, min: 103351, max: 197300 },
    { rate: 0.32, min: 197301, max: 250525 },
    { rate: 0.35, min: 250526, max: 375800 },
    { rate: 0.37, min: 375801, max: Infinity },
  ],
  headOfHousehold: [
    { rate: 0.1, min: 0, max: 17000 },
    { rate: 0.12, min: 17001, max: 64850 },
    { rate: 0.22, min: 64851, max: 103350 },
    { rate: 0.24, min: 103351, max: 197300 },
    { rate: 0.32, min: 197301, max: 250500 },
    { rate: 0.35, min: 250501, max: 626350 },
    { rate: 0.37, min: 626351, max: Infinity },
  ],
} as const;

export const STANDARD_DEDUCTION_2025 = {
  single: 15000,
  marriedJoint: 30000,
  marriedSeparate: 15000,
  headOfHousehold: 22500,
} as const;

export const CHILD_TAX_CREDIT_2025 = {
  maxCredit: 2000,
  refundablePortion: 1700,
  phaseOutSingle: 200000,
  phaseOutMarried: 400000,
  phaseOutRate: 0.05, // $50 per $1,000 over limit
} as const;

export const EITC_2025 = {
  noChildren: {
    maxCredit: 649,
    incomeLimitSingle: 19104,
    incomeLimitMarried: 26214,
  },
  oneChild: {
    maxCredit: 4328,
    incomeLimitSingle: 50434,
    incomeLimitMarried: 57544,
  },
  twoChildren: {
    maxCredit: 7152,
    incomeLimitSingle: 57316,
    incomeLimitMarried: 64426,
  },
  threeOrMore: {
    maxCredit: 8046,
    incomeLimitSingle: 61555,
    incomeLimitMarried: 68665,
  },
  investmentIncomeLimit: 11950,
} as const;

export const QUALIFIED_BUSINESS_INCOME_2025 = {
  deductionRate: 0.2, // 20% of QBI
  phaseOutSingle: 197300,
  phaseOutMarried: 394600,
  phaseOutRangeSingle: 50000,
  phaseOutRangeMarried: 100000,
} as const;
