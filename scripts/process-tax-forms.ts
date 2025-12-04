import { PrismaClient, TaxFormCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TaxFormMapping {
  oldFileName: string;
  newFileName: string;
  formNumber: string;
  title: string;
  category: TaxFormCategory;
  description?: string;
}

const formMappings: TaxFormMapping[] = [
  // Main Forms
  {
    oldFileName: 'f1040s.pdf',
    newFileName: 'Form_1040-SR.pdf',
    formNumber: '1040-SR',
    title: 'U.S. Income Tax Return for Seniors',
    category: 'MAIN_FORMS',
    description: 'Tax return form designed for seniors age 65 and older with larger print and a standard deduction chart.',
  },
  {
    oldFileName: 'fw2.pdf',
    newFileName: 'Form_W-2.pdf',
    formNumber: 'W-2',
    title: 'Wage and Tax Statement',
    category: 'MAIN_FORMS',
    description: 'Form showing wages paid and taxes withheld by an employer.',
  },

  // 1040 Schedules
  {
    oldFileName: 'f1040s1.pdf',
    newFileName: 'Schedule_1.pdf',
    formNumber: 'Schedule 1',
    title: 'Additional Income and Adjustments to Income',
    category: 'SCHEDULES_1040',
    description: 'Use to report additional income and claim adjustments to income.',
  },
  {
    oldFileName: 'f1040s2.pdf',
    newFileName: 'Schedule_2.pdf',
    formNumber: 'Schedule 2',
    title: 'Additional Taxes',
    category: 'SCHEDULES_1040',
    description: 'Use to report additional taxes such as self-employment tax and household employment taxes.',
  },
  {
    oldFileName: 'f1040s3.pdf',
    newFileName: 'Schedule_3.pdf',
    formNumber: 'Schedule 3',
    title: 'Additional Credits and Payments',
    category: 'SCHEDULES_1040',
    description: 'Use to claim nonrefundable credits and other payments.',
  },
  {
    oldFileName: 'f1040sa.pdf',
    newFileName: 'Schedule_A.pdf',
    formNumber: 'Schedule A',
    title: 'Itemized Deductions',
    category: 'SCHEDULES_1040',
    description: 'Use to itemize deductions for medical expenses, taxes, interest, gifts, and other expenses.',
  },
  {
    oldFileName: 'f1040sb.pdf',
    newFileName: 'Schedule_B.pdf',
    formNumber: 'Schedule B',
    title: 'Interest and Ordinary Dividends',
    category: 'SCHEDULES_1040',
    description: 'Use to report interest and ordinary dividend income exceeding $1,500.',
  },
  {
    oldFileName: 'f1040sc.pdf',
    newFileName: 'Schedule_C.pdf',
    formNumber: 'Schedule C',
    title: 'Profit or Loss from Business',
    category: 'SCHEDULES_1040',
    description: 'Use to report income or loss from a business you operated or profession you practiced as a sole proprietor.',
  },
  {
    oldFileName: 'f1040sd.pdf',
    newFileName: 'Schedule_D.pdf',
    formNumber: 'Schedule D',
    title: 'Capital Gains and Losses',
    category: 'SCHEDULES_1040',
    description: 'Use to report sales and exchanges of capital assets.',
  },
  {
    oldFileName: 'f1040se.pdf',
    newFileName: 'Schedule_E.pdf',
    formNumber: 'Schedule E',
    title: 'Supplemental Income and Loss',
    category: 'SCHEDULES_1040',
    description: 'Use to report income from rental real estate, royalties, partnerships, S corporations, estates, trusts, and REMICs.',
  },
  {
    oldFileName: 'f1040sse.pdf',
    newFileName: 'Schedule_SE.pdf',
    formNumber: 'Schedule SE',
    title: 'Self-Employment Tax',
    category: 'SCHEDULES_1040',
    description: 'Use to calculate the tax due on net earnings from self-employment.',
  },

  // 1099 Forms
  {
    oldFileName: 'f1099b.pdf',
    newFileName: 'Form_1099-B.pdf',
    formNumber: '1099-B',
    title: 'Proceeds from Broker and Barter Exchange Transactions',
    category: 'FORMS_1099',
    description: 'Reports proceeds from broker and barter exchange transactions.',
  },
  {
    oldFileName: 'f1099div.pdf',
    newFileName: 'Form_1099-DIV.pdf',
    formNumber: '1099-DIV',
    title: 'Dividends and Distributions',
    category: 'FORMS_1099',
    description: 'Reports dividends and distributions paid to you.',
  },
  {
    oldFileName: 'f1099int.pdf',
    newFileName: 'Form_1099-INT.pdf',
    formNumber: '1099-INT',
    title: 'Interest Income',
    category: 'FORMS_1099',
    description: 'Reports interest income paid to you.',
  },
  {
    oldFileName: 'f1099msc.pdf',
    newFileName: 'Form_1099-MISC.pdf',
    formNumber: '1099-MISC',
    title: 'Miscellaneous Income',
    category: 'FORMS_1099',
    description: 'Reports miscellaneous income such as rents, prizes, and awards.',
  },
  {
    oldFileName: 'f1099nec.pdf',
    newFileName: 'Form_1099-NEC.pdf',
    formNumber: '1099-NEC',
    title: 'Nonemployee Compensation',
    category: 'FORMS_1099',
    description: 'Reports payments made to independent contractors and other nonemployees.',
  },
  {
    oldFileName: 'f1099r.pdf',
    newFileName: 'Form_1099-R.pdf',
    formNumber: '1099-R',
    title: 'Distributions from Pensions, Annuities, Retirement Plans',
    category: 'FORMS_1099',
    description: 'Reports distributions from pensions, annuities, retirement or profit-sharing plans, IRAs, insurance contracts, etc.',
  },

  // Tax Credits
  {
    oldFileName: 'f2441.pdf',
    newFileName: 'Form_2441.pdf',
    formNumber: '2441',
    title: 'Child and Dependent Care Expenses',
    category: 'TAX_CREDITS',
    description: 'Use to claim the child and dependent care credit.',
  },
  {
    oldFileName: 'f5695.pdf',
    newFileName: 'Form_5695.pdf',
    formNumber: '5695',
    title: 'Residential Energy Credits',
    category: 'TAX_CREDITS',
    description: 'Use to claim credits for residential energy efficient property.',
  },
  {
    oldFileName: 'f8812.pdf',
    newFileName: 'Form_8812.pdf',
    formNumber: '8812',
    title: 'Credits for Qualifying Children and Other Dependents',
    category: 'TAX_CREDITS',
    description: 'Use to calculate the child tax credit and the credit for other dependents.',
  },
  {
    oldFileName: 'f8863.pdf',
    newFileName: 'Form_8863.pdf',
    formNumber: '8863',
    title: 'Education Credits',
    category: 'TAX_CREDITS',
    description: 'Use to claim the American Opportunity Credit and the Lifetime Learning Credit.',
  },
  {
    oldFileName: 'f8962.pdf',
    newFileName: 'Form_8962.pdf',
    formNumber: '8962',
    title: 'Premium Tax Credit',
    category: 'TAX_CREDITS',
    description: 'Use to reconcile advance payments of the premium tax credit.',
  },

  // Business Forms
  {
    oldFileName: 'f4562.pdf',
    newFileName: 'Form_4562.pdf',
    formNumber: '4562',
    title: 'Depreciation and Amortization',
    category: 'BUSINESS_FORMS',
    description: 'Use to claim deductions for depreciation and amortization.',
  },
  {
    oldFileName: 'f8995.pdf',
    newFileName: 'Form_8995.pdf',
    formNumber: '8995',
    title: 'Qualified Business Income Deduction',
    category: 'BUSINESS_FORMS',
    description: 'Use to calculate and claim the qualified business income deduction.',
  },

  // Other Forms
  {
    oldFileName: 'f8889.pdf',
    newFileName: 'Form_8889.pdf',
    formNumber: '8889',
    title: 'Health Savings Accounts (HSAs)',
    category: 'OTHER_FORMS',
    description: 'Use to report HSA contributions and distributions.',
  },
  {
    oldFileName: 'f8949.pdf',
    newFileName: 'Form_8949.pdf',
    formNumber: '8949',
    title: 'Sales and Other Dispositions of Capital Assets',
    category: 'OTHER_FORMS',
    description: 'Use to report sales and exchanges of capital assets.',
  },

  // Instructions
  {
    oldFileName: 'i1040gi.pdf',
    newFileName: 'Form_1040_Instructions.pdf',
    formNumber: '1040-GI',
    title: 'Form 1040 General Instructions',
    category: 'INSTRUCTIONS',
    description: 'Comprehensive instructions for completing Form 1040 and related schedules.',
  },
];

async function processTaxForms() {
  console.log('🚀 Starting Tax Forms Processing...\n');

  const sourceDir = '/root/websites/taxgeniuspro/.aaaaaa/Irs Documents';
  const targetDir = '/root/websites/taxgeniuspro/public/tax-forms/2024';
  const taxYear = 2024;

  // Step 1: Copy and rename files
  console.log('📁 Step 1: Copying and renaming PDF files...');
  let copiedCount = 0;

  for (const mapping of formMappings) {
    const sourcePath = path.join(sourceDir, mapping.oldFileName);
    const targetPath = path.join(targetDir, mapping.newFileName);

    try {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`   ✓ ${mapping.oldFileName} → ${mapping.newFileName}`);
        copiedCount++;
      } else {
        console.log(`   ⚠ ${mapping.oldFileName} not found, skipping...`);
      }
    } catch (error) {
      console.error(`   ✗ Error processing ${mapping.oldFileName}:`, error);
    }
  }

  console.log(`\n✅ Copied ${copiedCount} of ${formMappings.length} files\n`);

  // Step 2: Seed database
  console.log('💾 Step 2: Seeding database with form metadata...');
  let seededCount = 0;

  for (const mapping of formMappings) {
    const targetPath = path.join(targetDir, mapping.newFileName);

    if (fs.existsSync(targetPath)) {
      try {
        const stats = fs.statSync(targetPath);
        const fileSize = stats.size;

        // Check if form already exists
        const existing = await prisma.taxForm.findUnique({
          where: { formNumber: mapping.formNumber },
        });

        if (existing) {
          console.log(`   ↻ Updating ${mapping.formNumber}...`);
          await prisma.taxForm.update({
            where: { formNumber: mapping.formNumber },
            data: {
              title: mapping.title,
              description: mapping.description,
              category: mapping.category,
              taxYear,
              fileUrl: `/tax-forms/2024/${mapping.newFileName}`,
              fileName: mapping.newFileName,
              fileSize,
              isActive: true,
            },
          });
        } else {
          console.log(`   + Creating ${mapping.formNumber}...`);
          await prisma.taxForm.create({
            data: {
              formNumber: mapping.formNumber,
              title: mapping.title,
              description: mapping.description,
              category: mapping.category,
              taxYear,
              fileUrl: `/tax-forms/2024/${mapping.newFileName}`,
              fileName: mapping.newFileName,
              fileSize,
              isActive: true,
            },
          });
        }

        seededCount++;
      } catch (error) {
        console.error(`   ✗ Error seeding ${mapping.formNumber}:`, error);
      }
    }
  }

  console.log(`\n✅ Seeded ${seededCount} forms to database\n`);

  // Step 3: Summary
  console.log('📊 Summary by Category:');
  const summary = await prisma.taxForm.groupBy({
    by: ['category'],
    _count: true,
  });

  for (const item of summary) {
    console.log(`   ${item.category}: ${item._count} forms`);
  }

  console.log('\n✨ Tax Forms Processing Complete!\n');
}

processTaxForms()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
