/**
 * Import Tax Preparers Script
 *
 * Run with: npx tsx scripts/import-preparers.ts
 *
 * This script imports the 35 tax preparers from the old system.
 * It calls the /api/admin/import-preparers endpoint.
 */

// The 35 tax preparers to import
const TAX_PREPARERS = [
  { firstName: 'Ale', lastName: 'Hamilton', email: 'goldenprotaxes@gmail.com', trackingCode: 'ah' },
  { firstName: 'Alicia', lastName: 'Adams', email: 'caydensmother29@gmail.com', trackingCode: 'aa' },
  { firstName: 'Angela', lastName: 'Richards', email: 'angeladesigndocs@gmail.com', trackingCode: 'ar' },
  { firstName: 'Anita', lastName: 'Wilson', email: 'anita@cm3mediagroup.pro', trackingCode: 'aw' },
  { firstName: 'Brandon', lastName: 'Hawkins', email: 'busyb101@gmail.com', trackingCode: 'bh' },
  { firstName: 'Carlton', lastName: 'Gannaway', email: 'f.alawishez@gmail.com', trackingCode: 'cg' },
  { firstName: 'Ceia', lastName: 'Stewart', email: 'consult.me@mail.com', trackingCode: 'cs' },
  { firstName: 'Chelsea', lastName: 'Lowe', email: 'c.mitchell.lowe@gmail.com', trackingCode: 'cl' },
  { firstName: 'Cynthia', lastName: 'Bacon-whitted', email: 'cbawhitted@gmail.com', trackingCode: 'cbw' },
  { firstName: 'Derrick', lastName: 'Stewart', email: 'derrick.stewart31@yahoo.com', trackingCode: 'ds' },
  { firstName: 'Devlin', lastName: 'Watkins', email: 'iradwatkins+dw@gmail.com', trackingCode: 'dw' },
  { firstName: 'Devon', lastName: 'Hamilton', email: 'gxldmxb@gmail.com', trackingCode: 'dh' },
  { firstName: 'Erica', lastName: 'Bridges', email: 'msboss110284@gmail.com', trackingCode: 'eb' },
  { firstName: 'Gelisa', lastName: 'White', email: 'whitegelisa@gmail.com', trackingCode: 'gw' },
  { firstName: 'Gregory', lastName: 'Edwards', email: 'gregthetaxgenius@gmail.com', trackingCode: 'ge' },
  { firstName: 'Helen', lastName: 'Holmes', email: 'holmeshelen@yahoo.com', trackingCode: 'hh' },
  { firstName: 'Ira', lastName: 'Watkins', email: 'iradwatkins@gmail.com', trackingCode: 'iw' },
  { firstName: 'Iran', lastName: 'Watkins', email: 'iradwatkins+iw1@gmail.com', trackingCode: 'iw1' },
  { firstName: 'Jamel', lastName: 'Pringle', email: 'melpringle38@gmail.com', trackingCode: 'jp' },
  { firstName: 'Javarre', lastName: 'Massey', email: 'javareemassey@gmail.com', trackingCode: 'jm' },
  { firstName: 'Katie', lastName: 'Winborn', email: 'winbornkatie@gmail.com', trackingCode: 'kw' },
  { firstName: 'Kemnetta', lastName: 'Pillette', email: 'kpillette7@gmail.com', trackingCode: 'kp' },
  { firstName: 'LaJuana', lastName: 'Frost', email: 'lajuanafrost@gmail.com', trackingCode: 'lf' },
  { firstName: 'Lenore', lastName: 'Bohanon', email: 'lbohanon398@gmail.com', trackingCode: 'lb' },
  { firstName: 'Mariah', lastName: 'Johnson', email: 'msj1solution@gmail.com', trackingCode: 'mj' },
  { firstName: 'Michael', lastName: 'Finley', email: 'mrmikefinley@gmail.com', trackingCode: 'mf' },
  { firstName: 'Owliver', lastName: 'Owl', email: 'taxgenius.tax@gmail.com', trackingCode: 'ow' },
  { firstName: 'Pamela', lastName: 'Johnson', email: 'pamelajatl3@gmail.com', trackingCode: 'pj' },
  { firstName: 'Ray', lastName: 'Hamilton', email: 'rhamiltonfirm@gmail.com', trackingCode: 'rh' },
  { firstName: 'Sarah', lastName: 'Wilson', email: 'hest8133@bellsouth.net', trackingCode: 'sw' },
  { firstName: 'Shakia', lastName: 'JGibbs', email: 'shakiragibbs12@gmail.com', trackingCode: 'sj' },
  { firstName: 'Tiffany & Jakobe', lastName: 'Pearson', email: 'jakobepearson18@gmail.com', trackingCode: 'tp' },
  { firstName: 'Trevor', lastName: 'Wikerson', email: 'tjbw2005@gmail.com', trackingCode: 'tw' },
  { firstName: 'Wendy', lastName: 'Casimir', email: 'wendycasimir@gmail.com', trackingCode: 'wc' },
  { firstName: 'Yaumar', lastName: 'Williams', email: 'yaumarwilliams@gmail.com', trackingCode: 'yw' },
];

async function importPreparers() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const apiUrl = `${baseUrl}/api/admin/import-preparers`;

  console.log('='.repeat(60));
  console.log('TAX PREPARER IMPORT SCRIPT');
  console.log('='.repeat(60));
  console.log(`\nTotal preparers to import: ${TAX_PREPARERS.length}`);
  console.log(`API endpoint: ${apiUrl}\n`);

  // Note: This requires authentication
  // You'll need to either:
  // 1. Run this from an authenticated session
  // 2. Add an admin API key
  // 3. Use the browser console with auth cookies

  console.log('To import these preparers, you have two options:\n');

  console.log('OPTION 1: Use browser console (recommended)');
  console.log('-'.repeat(40));
  console.log('1. Log in as admin at https://taxgeniuspro.tax');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Paste and run this code:\n');

  const browserCode = `
// Run this in browser console while logged in as admin
fetch('/api/admin/import-preparers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    preparers: ${JSON.stringify(TAX_PREPARERS, null, 2)}
  })
})
.then(r => r.json())
.then(data => {
  console.log('Import Results:', data);
  if (data.summary) {
    console.log('\\n=== SUMMARY ===');
    console.log('Created:', data.summary.created);
    console.log('Skipped:', data.summary.skipped);
    console.log('Errors:', data.summary.errors);
  }
})
.catch(err => console.error('Import failed:', err));
`;

  console.log(browserCode);

  console.log('\n' + '-'.repeat(40));
  console.log('OPTION 2: Direct API call with admin key');
  console.log('-'.repeat(40));
  console.log('Add ADMIN_SETUP_KEY to your .env and run:');
  console.log(`
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-admin-key: YOUR_ADMIN_KEY" \\
  -d '${JSON.stringify({ preparers: TAX_PREPARERS })}'
`);

  console.log('\n' + '='.repeat(60));
  console.log('After import, preparers can sign up with their email');
  console.log('They will automatically be assigned the tax_preparer role');
  console.log('='.repeat(60));
}

// Run the script
importPreparers().catch(console.error);
