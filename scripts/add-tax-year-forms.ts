import { PrismaClient, TaxFormCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Script to add tax forms for a new tax year
 *
 * Usage:
 * 1. Create directory: /public/tax-forms/[YEAR]/
 * 2. Copy PDF files to the directory
 * 3. Run: npx tsx scripts/add-tax-year-forms.ts --year=2025
 *
 * The script will:
 * - Scan the directory for PDF files
 * - Attempt to match filenames to known form numbers
 * - Create database records for each form
 * - Generate a report of added forms
 */

interface FormMapping {
  pattern: RegExp;
  formNumber: string;
  title: string;
  category: TaxFormCategory;
  description?: string;
}

// Known form patterns and their metadata
const knownForms: FormMapping[] = [
  // Main Forms
  {
    pattern: /^(f1040sr?|1040-?sr)\.pdf$/i,
    formNumber: '1040-SR',
    title: 'U.S. Income Tax Return for Seniors',
    category: 'MAIN_FORMS',
    description: 'Tax return form designed for seniors age 65 and older.',
  },
  {
    pattern: /^(fw2|w-?2)\.pdf$/i,
    formNumber: 'W-2',
    title: 'Wage and Tax Statement',
    category: 'MAIN_FORMS',
    description: 'Form showing wages paid and taxes withheld by an employer.',
  },

  // 1040 Schedules
  {
    pattern: /^(f1040s1|schedule-?1)\.pdf$/i,
    formNumber: 'Schedule 1',
    title: 'Additional Income and Adjustments to Income',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040s2|schedule-?2)\.pdf$/i,
    formNumber: 'Schedule 2',
    title: 'Additional Taxes',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040s3|schedule-?3)\.pdf$/i,
    formNumber: 'Schedule 3',
    title: 'Additional Credits and Payments',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040sa|schedule-?a)\.pdf$/i,
    formNumber: 'Schedule A',
    title: 'Itemized Deductions',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040sb|schedule-?b)\.pdf$/i,
    formNumber: 'Schedule B',
    title: 'Interest and Ordinary Dividends',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040sc|schedule-?c)\.pdf$/i,
    formNumber: 'Schedule C',
    title: 'Profit or Loss from Business',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040sd|schedule-?d)\.pdf$/i,
    formNumber: 'Schedule D',
    title: 'Capital Gains and Losses',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040se|schedule-?e)\.pdf$/i,
    formNumber: 'Schedule E',
    title: 'Supplemental Income and Loss',
    category: 'SCHEDULES_1040',
  },
  {
    pattern: /^(f1040sse|schedule-?se)\.pdf$/i,
    formNumber: 'Schedule SE',
    title: 'Self-Employment Tax',
    category: 'SCHEDULES_1040',
  },

  // 1099 Forms
  {
    pattern: /^(f1099b|1099-?b)\.pdf$/i,
    formNumber: '1099-B',
    title: 'Proceeds from Broker and Barter Exchange Transactions',
    category: 'FORMS_1099',
  },
  {
    pattern: /^(f1099div|1099-?div)\.pdf$/i,
    formNumber: '1099-DIV',
    title: 'Dividends and Distributions',
    category: 'FORMS_1099',
  },
  {
    pattern: /^(f1099int|1099-?int)\.pdf$/i,
    formNumber: '1099-INT',
    title: 'Interest Income',
    category: 'FORMS_1099',
  },
  {
    pattern: /^(f1099msc|1099-?misc)\.pdf$/i,
    formNumber: '1099-MISC',
    title: 'Miscellaneous Income',
    category: 'FORMS_1099',
  },
  {
    pattern: /^(f1099nec|1099-?nec)\.pdf$/i,
    formNumber: '1099-NEC',
    title: 'Nonemployee Compensation',
    category: 'FORMS_1099',
  },
  {
    pattern: /^(f1099r|1099-?r)\.pdf$/i,
    formNumber: '1099-R',
    title: 'Distributions from Pensions, Annuities, Retirement Plans',
    category: 'FORMS_1099',
  },

  // Tax Credits
  {
    pattern: /^f2441\.pdf$/i,
    formNumber: '2441',
    title: 'Child and Dependent Care Expenses',
    category: 'TAX_CREDITS',
  },
  {
    pattern: /^f5695\.pdf$/i,
    formNumber: '5695',
    title: 'Residential Energy Credits',
    category: 'TAX_CREDITS',
  },
  {
    pattern: /^f8812\.pdf$/i,
    formNumber: '8812',
    title: 'Credits for Qualifying Children and Other Dependents',
    category: 'TAX_CREDITS',
  },
  {
    pattern: /^f8863\.pdf$/i,
    formNumber: '8863',
    title: 'Education Credits',
    category: 'TAX_CREDITS',
  },
  {
    pattern: /^f8962\.pdf$/i,
    formNumber: '8962',
    title: 'Premium Tax Credit',
    category: 'TAX_CREDITS',
  },

  // Business Forms
  {
    pattern: /^f4562\.pdf$/i,
    formNumber: '4562',
    title: 'Depreciation and Amortization',
    category: 'BUSINESS_FORMS',
  },
  {
    pattern: /^f8995\.pdf$/i,
    formNumber: '8995',
    title: 'Qualified Business Income Deduction',
    category: 'BUSINESS_FORMS',
  },

  // Other Forms
  {
    pattern: /^f8889\.pdf$/i,
    formNumber: '8889',
    title: 'Health Savings Accounts (HSAs)',
    category: 'OTHER_FORMS',
  },
  {
    pattern: /^f8949\.pdf$/i,
    formNumber: '8949',
    title: 'Sales and Other Dispositions of Capital Assets',
    category: 'OTHER_FORMS',
  },

  // Instructions
  {
    pattern: /^(i1040gi|1040.*instructions?)\.pdf$/i,
    formNumber: '1040-GI',
    title: 'Form 1040 General Instructions',
    category: 'INSTRUCTIONS',
  },
];

async function addTaxYearForms(taxYear: number) {
  console.log(`\n🚀 Adding Tax Forms for Year ${taxYear}\n`);

  const formsDir = path.join(process.cwd(), 'public', 'tax-forms', taxYear.toString());

  // Check if directory exists
  if (!fs.existsSync(formsDir)) {
    console.error(`❌ Directory not found: ${formsDir}`);
    console.log(`\nPlease create the directory and add PDF files first:`);
    console.log(`  mkdir -p ${formsDir}`);
    console.log(`  # Then copy your PDF files to ${formsDir}/`);
    process.exit(1);
  }

  // Read all PDF files in directory
  const files = fs.readdirSync(formsDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.error(`❌ No PDF files found in ${formsDir}`);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} PDF files\n`);

  let addedCount = 0;
  let skippedCount = 0;
  let unknownCount = 0;

  for (const filename of files) {
    const filePath = path.join(formsDir, filename);
    const stats = fs.statSync(filePath);

    // Try to match filename to known forms
    const match = knownForms.find((form) => form.pattern.test(filename));

    if (!match) {
      console.log(`   ⚠ Unknown form: ${filename} (skipping)`);
      unknownCount++;
      continue;
    }

    // Check if form already exists for this year
    const existing = await prisma.taxForm.findFirst({
      where: {
        formNumber: match.formNumber,
        taxYear,
      },
    });

    if (existing) {
      console.log(`   ↻ Already exists: ${match.formNumber} (${filename})`);
      skippedCount++;
      continue;
    }

    // Create form record
    await prisma.taxForm.create({
      data: {
        formNumber: match.formNumber,
        title: match.title,
        description: match.description,
        category: match.category,
        taxYear,
        fileUrl: `/tax-forms/${taxYear}/${filename}`,
        fileName: filename,
        fileSize: stats.size,
        isActive: true,
      },
    });

    console.log(`   ✓ Added: ${match.formNumber} (${filename})`);
    addedCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Added: ${addedCount}`);
  console.log(`   Skipped (already exist): ${skippedCount}`);
  console.log(`   Unknown (not recognized): ${unknownCount}`);
  console.log(`   Total files: ${files.length}`);

  if (unknownCount > 0) {
    console.log(`\n💡 To add unknown forms manually, update the knownForms array in this script`);
  }

  console.log(`\n✨ Complete!\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const yearArg = args.find((arg) => arg.startsWith('--year='));

if (!yearArg) {
  console.error('❌ Missing --year argument');
  console.log('\nUsage: npx tsx scripts/add-tax-year-forms.ts --year=2025');
  process.exit(1);
}

const taxYear = parseInt(yearArg.split('=')[1]);

if (isNaN(taxYear) || taxYear < 2020 || taxYear > 2030) {
  console.error('❌ Invalid year. Please provide a year between 2020 and 2030');
  process.exit(1);
}

addTaxYearForms(taxYear)
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
