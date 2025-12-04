/**
 * 2024 Federal Tax Data
 * Source: IRS Revenue Procedure 2023-34
 * https://www.irs.gov/filing/federal-income-tax-rates-and-brackets
 */

export interface TaxBracket {
  rate: number;
  min: number;
  max: number;
}

export const TAX_BRACKETS_2024 = {
  single: [
    { rate: 0.1, min: 0, max: 11600 },
    { rate: 0.12, min: 11601, max: 47150 },
    { rate: 0.22, min: 47151, max: 100525 },
    { rate: 0.24, min: 100526, max: 191950 },
    { rate: 0.32, min: 191951, max: 243725 },
    { rate: 0.35, min: 243726, max: 609350 },
    { rate: 0.37, min: 609351, max: Infinity },
  ],
  marriedJoint: [
    { rate: 0.1, min: 0, max: 23200 },
    { rate: 0.12, min: 23201, max: 94300 },
    { rate: 0.22, min: 94301, max: 201050 },
    { rate: 0.24, min: 201051, max: 383900 },
    { rate: 0.32, min: 383901, max: 487450 },
    { rate: 0.35, min: 487451, max: 731200 },
    { rate: 0.37, min: 731201, max: Infinity },
  ],
  marriedSeparate: [
    { rate: 0.1, min: 0, max: 11600 },
    { rate: 0.12, min: 11601, max: 47150 },
    { rate: 0.22, min: 47151, max: 100525 },
    { rate: 0.24, min: 100526, max: 191950 },
    { rate: 0.32, min: 191951, max: 243725 },
    { rate: 0.35, min: 243726, max: 365600 },
    { rate: 0.37, min: 365601, max: Infinity },
  ],
  headOfHousehold: [
    { rate: 0.1, min: 0, max: 16550 },
    { rate: 0.12, min: 16551, max: 63100 },
    { rate: 0.22, min: 63101, max: 100500 },
    { rate: 0.24, min: 100501, max: 191950 },
    { rate: 0.32, min: 191951, max: 243700 },
    { rate: 0.35, min: 243701, max: 609350 },
    { rate: 0.37, min: 609351, max: Infinity },
  ],
} as const;

export const STANDARD_DEDUCTION_2024 = {
  single: 14600,
  marriedJoint: 29200,
  marriedSeparate: 14600,
  headOfHousehold: 21900,
} as const;

export const CHILD_TAX_CREDIT_2024 = {
  maxCredit: 2000,
  refundablePortion: 1700,
  phaseOutSingle: 200000,
  phaseOutMarried: 400000,
  phaseOutRate: 0.05, // $50 per $1,000 over limit
} as const;

export const EITC_2024 = {
  noChildren: {
    maxCredit: 632,
    incomeLimitSingle: 18591,
    incomeLimitMarried: 25511,
  },
  oneChild: {
    maxCredit: 4213,
    incomeLimitSingle: 49084,
    incomeLimitMarried: 56004,
  },
  twoChildren: {
    maxCredit: 6960,
    incomeLimitSingle: 55768,
    incomeLimitMarried: 62688,
  },
  threeOrMore: {
    maxCredit: 7830,
    incomeLimitSingle: 59899,
    incomeLimitMarried: 66819,
  },
  investmentIncomeLimit: 11600,
} as const;

export const QUALIFIED_BUSINESS_INCOME_2024 = {
  deductionRate: 0.2, // 20% of QBI
  phaseOutSingle: 191950,
  phaseOutMarried: 383900,
  phaseOutRangeSingle: 50000,
  phaseOutRangeMarried: 100000,
} as const;
