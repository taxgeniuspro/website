/**
 * Final Checklist Verification
 * Phase 13: Pre-handover verification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
}

const results: CheckResult[] = [];
const BASE_URL = process.env.TEST_URL || 'https://taxgeniuspro.tax';

function log(emoji: string, message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${emoji} ${message}`);
}

function addResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string) {
  results.push({ name, status, details });
  const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  log(statusEmoji, `${status}: ${name}${details ? ` - ${details}` : ''}`);
}

// ============ Security Checklist ============

async function checkSecurity() {
  log('🔐', 'Security Checklist...\n');

  // Check HTTPS enforcement (via headers)
  const httpsResponse = await fetch(BASE_URL);
  const hstsHeader = httpsResponse.headers.get('strict-transport-security');
  addResult(
    'HTTPS enforced (HSTS)',
    hstsHeader ? 'PASS' : 'WARN',
    hstsHeader || 'HSTS header not found'
  );

  // Check security headers
  const xContentType = httpsResponse.headers.get('x-content-type-options');
  addResult(
    'X-Content-Type-Options',
    xContentType === 'nosniff' ? 'PASS' : 'WARN',
    xContentType || 'Not set'
  );

  const xFrameOptions = httpsResponse.headers.get('x-frame-options');
  addResult(
    'X-Frame-Options',
    xFrameOptions ? 'PASS' : 'WARN',
    xFrameOptions || 'Not set'
  );

  // Check admin routes are protected
  const adminResponse = await fetch(`${BASE_URL}/api/admin/payouts`);
  addResult(
    'Admin routes protected',
    adminResponse.status === 401 ? 'PASS' : 'FAIL',
    `Status: ${adminResponse.status}`
  );
}

// ============ Operational Checklist ============

async function checkOperational() {
  log('⚙️', 'Operational Checklist...\n');

  // Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    addResult('Database connectivity', 'PASS', 'PostgreSQL connected');
  } catch {
    addResult('Database connectivity', 'FAIL', 'Cannot connect to database');
  }

  // Check tax preparers have tracking codes
  const preparersWithTracking = await prisma.profile.count({
    where: {
      role: 'tax_preparer',
      OR: [
        { customTrackingCode: { not: null } },
        { trackingCode: { not: null } },
      ],
    },
  });

  const totalPreparers = await prisma.profile.count({
    where: { role: 'tax_preparer' },
  });

  addResult(
    'Preparers have tracking codes',
    preparersWithTracking >= 30 ? 'PASS' : 'WARN',
    `${preparersWithTracking}/${totalPreparers} preparers`
  );

  // Check short links exist
  const shortLinkCount = await prisma.marketingLink.count();
  addResult(
    'Short links configured',
    shortLinkCount >= 100 ? 'PASS' : 'WARN',
    `${shortLinkCount} marketing links`
  );

  // Health check endpoint
  const healthResponse = await fetch(`${BASE_URL}/api/health`);
  addResult(
    'Health check endpoint',
    healthResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${healthResponse.status}`
  );

  // Check QR codes exist
  const preparersWithQR = await prisma.profile.count({
    where: {
      role: 'tax_preparer',
      qrCodeLogoUrl: { not: null },
    },
  });
  addResult(
    'QR codes generated',
    preparersWithQR >= 30 ? 'PASS' : 'WARN',
    `${preparersWithQR}/${totalPreparers} have QR codes`
  );
}

// ============ Data Checklist ============

async function checkData() {
  log('📊', 'Data Checklist...\n');

  // User counts
  const userCount = await prisma.user.count();
  const profileCount = await prisma.profile.count();
  addResult(
    'User/Profile consistency',
    userCount === profileCount ? 'PASS' : 'WARN',
    `${userCount} users, ${profileCount} profiles`
  );

  // Role distribution
  const roleCounts = await prisma.profile.groupBy({
    by: ['role'],
    _count: true,
  });

  const roleStr = roleCounts.map((r) => `${r.role}: ${r._count}`).join(', ');
  addResult('Role distribution', 'PASS', roleStr);

  // Lead counts
  const leadCount = await prisma.taxIntakeLead.count();
  addResult('Intake leads', 'PASS', `${leadCount} leads in system`);

  // Appointment counts
  const appointmentCount = await prisma.appointment.count();
  addResult('Appointments', 'PASS', `${appointmentCount} appointments`);

  // Commission configuration
  const commissionCount = await prisma.commission.count();
  addResult('Commission records', 'PASS', `${commissionCount} commissions`);
}

// ============ Feature Verification ============

async function checkFeatures() {
  log('🎯', 'Feature Verification...\n');

  // Short link redirect
  const shortLinkResponse = await fetch(`${BASE_URL}/go/gw-lead`, {
    redirect: 'manual',
  });
  addResult(
    'Short link redirects work',
    shortLinkResponse.status === 307 || shortLinkResponse.status === 302 ? 'PASS' : 'FAIL',
    `Status: ${shortLinkResponse.status}`
  );

  // Auth page loads
  const signinResponse = await fetch(`${BASE_URL}/auth/signin`);
  addResult(
    'Auth pages accessible',
    signinResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${signinResponse.status}`
  );

  // Public pages load
  const homeResponse = await fetch(BASE_URL);
  addResult(
    'Homepage accessible',
    homeResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${homeResponse.status}`
  );

  // Start filing page
  const filingResponse = await fetch(`${BASE_URL}/start-filing`);
  addResult(
    'Start filing page accessible',
    filingResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${filingResponse.status}`
  );

  // Products/store
  const storeResponse = await fetch(`${BASE_URL}/api/products`);
  addResult(
    'Store products API',
    storeResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${storeResponse.status}`
  );
}

// ============ Summary ============

function printSummary() {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  FINAL CHECKLIST - HANDOVER VERIFICATION');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warnings = results.filter((r) => r.status === 'WARN').length;

  console.log('  SECURITY:');
  results.slice(0, 4).forEach((r) => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`    ${emoji} ${r.name}: ${r.details || ''}`);
  });

  console.log('\n  OPERATIONAL:');
  results.slice(4, 9).forEach((r) => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`    ${emoji} ${r.name}: ${r.details || ''}`);
  });

  console.log('\n  DATA:');
  results.slice(9, 14).forEach((r) => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`    ${emoji} ${r.name}: ${r.details || ''}`);
  });

  console.log('\n  FEATURES:');
  results.slice(14).forEach((r) => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`    ${emoji} ${r.name}: ${r.details || ''}`);
  });

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed, ${warnings} warnings`);

  if (failed === 0) {
    console.log('\n  ✅ SYSTEM READY FOR HANDOVER');
  } else {
    console.log('\n  ❌ ISSUES NEED TO BE RESOLVED BEFORE HANDOVER');
  }

  console.log('══════════════════════════════════════════════════════════════════════\n');

  return { passed, failed, warnings };
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  TAX GENIUS PRO - FINAL HANDOVER CHECKLIST');
  console.log(`  Date: ${new Date().toLocaleDateString()}`);
  console.log(`  Target: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  try {
    await checkSecurity();
    await checkOperational();
    await checkData();
    await checkFeatures();

    const summary = printSummary();

    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
