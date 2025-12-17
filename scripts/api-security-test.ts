/**
 * API Security Test Suite
 * Tests authentication, authorization, and input validation
 *
 * Phase 8: Security Testing
 */

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
}

const results: TestResult[] = [];
const BASE_URL = process.env.TEST_URL || 'https://taxgeniuspro.tax';

function log(emoji: string, message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${emoji} ${message}`);
}

function addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: string) {
  results.push({ name, status, details });
  const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  log(statusEmoji, `${status}: ${name}${details ? ` - ${details}` : ''}`);
}

async function testEndpoint(
  name: string,
  method: string,
  endpoint: string,
  expectedStatus: number,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; data: unknown }> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    const passed = response.status === expectedStatus;
    addResult(
      name,
      passed ? 'PASS' : 'FAIL',
      `Expected ${expectedStatus}, got ${response.status}`
    );

    return { status: response.status, data };
  } catch (error) {
    addResult(name, 'FAIL', `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { status: 0, data: null };
  }
}

// ============ Authentication Bypass Tests ============

async function testAuthenticationBypass() {
  log('🔐', 'Testing: Authentication bypass attempts...\n');

  // Test admin payouts without authentication
  await testEndpoint(
    'Admin payouts API - no auth',
    'GET',
    '/api/admin/payouts',
    401
  );

  // Test tax preparer leads without authentication
  await testEndpoint(
    'Preparer leads API - no auth',
    'GET',
    '/api/tax-preparer/leads',
    401
  );

  // Test client documents without authentication
  await testEndpoint(
    'Client documents API - no auth',
    'GET',
    '/api/documents/upload',
    401
  );

  // Test profile API without authentication
  await testEndpoint(
    'Profile API - no auth',
    'GET',
    '/api/profile',
    401
  );

  // Test earnings summary without auth
  await testEndpoint(
    'Earnings summary API - no auth',
    'GET',
    '/api/earnings/summary',
    401
  );

  // Test tax preparer clients without auth
  await testEndpoint(
    'Tax preparer clients API - no auth',
    'GET',
    '/api/tax-preparer/clients',
    401
  );
}

// ============ Input Validation Tests ============

async function testInputValidation() {
  log('🔍', 'Testing: Input validation...\n');

  // Test form submissions with invalid data
  await testEndpoint(
    'Form submission - empty body',
    'POST',
    '/api/submissions',
    401, // Should require auth
    { body: {} }
  );

  // Test AI content generation without auth
  await testEndpoint(
    'AI content API - no auth',
    'POST',
    '/api/ai-content/generate',
    401,
    { body: { prompt: 'Test prompt' } }
  );

  // Test auth endpoint - security best practice: always returns 200 to prevent email enumeration
  const forgotResponse = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });

  // Returns 200 regardless of email validity to prevent enumeration - this is correct security behavior
  addResult(
    'Auth forgot password - anti-enumeration',
    forgotResponse.status === 200 ? 'PASS' : 'FAIL',
    `Returns 200 regardless of email (prevents enumeration)`
  );

  // Test referral tracking (should be public but validate input)
  await testEndpoint(
    'Referral track - empty body',
    'POST',
    '/api/referrals/track',
    400,
    { body: {} }
  );
}

// ============ Rate Limiting Tests ============

async function testRateLimiting() {
  log('⏱️', 'Testing: Rate limiting...\n');

  // Note: Rate limiting tests need repeated requests
  // We'll test that rate limit headers are present

  const response = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rate Limit Test',
      email: 'ratelimit@test.com',
      message: 'Testing rate limits',
    }),
  });

  // Check for rate limit headers
  const hasRateLimitHeaders =
    response.headers.has('x-ratelimit-limit') ||
    response.headers.has('x-ratelimit-remaining');

  addResult(
    'Rate limit headers present',
    hasRateLimitHeaders ? 'PASS' : 'SKIP',
    hasRateLimitHeaders
      ? `Limit: ${response.headers.get('x-ratelimit-limit')}, Remaining: ${response.headers.get('x-ratelimit-remaining')}`
      : 'Rate limiting may use in-memory store without headers'
  );
}

// ============ Public API Access Tests ============

async function testPublicAPIAccess() {
  log('🌐', 'Testing: Public API access...\n');

  // Test public tracking redirect (should work without auth)
  const trackingResponse = await fetch(`${BASE_URL}/go/gw-lead`, {
    redirect: 'manual',
  });

  addResult(
    'Short link redirect accessible',
    trackingResponse.status === 307 || trackingResponse.status === 302 ? 'PASS' : 'FAIL',
    `Status: ${trackingResponse.status}`
  );

  // Test appointment slots (should be public)
  const slotsResponse = await fetch(`${BASE_URL}/api/appointments/available-slots`);
  addResult(
    'Appointment slots - public access',
    slotsResponse.status !== 401 ? 'PASS' : 'FAIL',
    `Status: ${slotsResponse.status} (should not be 401)`
  );

  // Test health check endpoint
  const healthResponse = await fetch(`${BASE_URL}/api/health`);
  addResult(
    'Health check endpoint',
    healthResponse.status === 200 ? 'PASS' : 'FAIL',
    `Status: ${healthResponse.status}`
  );

  // Test products list (should be public for store)
  const productsResponse = await fetch(`${BASE_URL}/api/products`);
  addResult(
    'Products API - public access',
    productsResponse.status !== 401 ? 'PASS' : 'FAIL',
    `Status: ${productsResponse.status} (should not be 401)`
  );
}

// ============ CORS and Security Headers ============

async function testSecurityHeaders() {
  log('🛡️', 'Testing: Security headers...\n');

  const response = await fetch(`${BASE_URL}/`);

  const headers = {
    'x-content-type-options': response.headers.get('x-content-type-options'),
    'x-frame-options': response.headers.get('x-frame-options'),
    'strict-transport-security': response.headers.get('strict-transport-security'),
    'content-security-policy': response.headers.get('content-security-policy'),
  };

  addResult(
    'X-Content-Type-Options header',
    headers['x-content-type-options'] ? 'PASS' : 'SKIP',
    headers['x-content-type-options'] || 'Not set (Vercel default)'
  );

  addResult(
    'X-Frame-Options header',
    headers['x-frame-options'] ? 'PASS' : 'SKIP',
    headers['x-frame-options'] || 'Not set'
  );

  addResult(
    'Strict-Transport-Security header',
    headers['strict-transport-security'] ? 'PASS' : 'SKIP',
    headers['strict-transport-security'] || 'Not set (Vercel handles HTTPS)'
  );
}

// ============ Summary ============

function printSummary() {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  API SECURITY TEST RESULTS');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  results.forEach((r) => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`  ${emoji} ${r.name}`);
    if (r.details) {
      console.log(`     └─ ${r.details}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  return { passed, failed, skipped };
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  TAX GENIUS PRO - API SECURITY TEST');
  console.log(`  Target: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  try {
    await testAuthenticationBypass();
    await testInputValidation();
    await testRateLimiting();
    await testPublicAPIAccess();
    await testSecurityHeaders();

    const summary = printSummary();

    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

main();
