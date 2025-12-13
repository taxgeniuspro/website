/**
 * Test Account Fixtures
 *
 * Centralized test account definitions for E2E tests.
 * These accounts should exist in the test database.
 *
 * IMPORTANT: Only 4 valid roles exist:
 * - admin
 * - tax_preparer
 * - lead
 * - client
 *
 * The 'affiliate' role was deprecated and merged into client with affiliateStatus.
 */

export interface TestAccount {
  role: string; // Display name
  dbRole: string; // Database role value
  email: string;
  password: string;
  expectedUrl: string;
  dashboardTitle: string;
  expectedElements: string[];
  forbiddenElements: string[];
}

/**
 * Test accounts for development/testing environment
 * These should be seeded in the test database
 */
export const testAccounts: TestAccount[] = [
  {
    role: 'Admin',
    dbRole: 'admin',
    email: 'admin@test.com',
    password: 'admin123',
    expectedUrl: '/dashboard/admin',
    dashboardTitle: 'Admin Dashboard',
    expectedElements: ['Dashboard', 'Admin', 'Users', 'Analytics'],
    forbiddenElements: [],
  },
  {
    role: 'Tax Preparer',
    dbRole: 'tax_preparer',
    email: 'preparer@test.com',
    password: 'preparer123',
    expectedUrl: '/dashboard/tax-preparer',
    dashboardTitle: 'Tax Preparer Dashboard',
    expectedElements: ['Dashboard', 'Preparer', 'Clients'],
    forbiddenElements: [],
  },
  {
    role: 'Client',
    dbRole: 'client',
    email: 'client@test.com',
    password: 'client123',
    expectedUrl: '/dashboard/client',
    dashboardTitle: 'Client Dashboard',
    expectedElements: ['Dashboard'],
    forbiddenElements: ['Admin Panel', 'User Management'],
  },
  {
    role: 'Lead',
    dbRole: 'lead',
    email: 'lead@test.com',
    password: 'lead123',
    expectedUrl: '/dashboard/lead',
    dashboardTitle: 'Account Pending Approval',
    expectedElements: ['Pending', 'Approval'],
    forbiddenElements: ['Admin', 'Tax Return'],
  },
];

/**
 * Production accounts for smoke testing
 * NOTE: Passwords should be stored in .env.test, never committed
 */
export const productionAccounts: Pick<TestAccount, 'role' | 'dbRole' | 'email' | 'expectedUrl'>[] = [
  {
    role: 'Admin (Ira)',
    dbRole: 'admin',
    email: 'iradwatkins@gmail.com',
    expectedUrl: '/dashboard/admin',
  },
  {
    role: 'Tax Preparer (Owliver)',
    dbRole: 'tax_preparer',
    email: 'taxgenius.tax@gmail.com',
    expectedUrl: '/dashboard/tax-preparer',
  },
  {
    role: 'Tax Preparer (Gelisa)',
    dbRole: 'tax_preparer',
    email: 'whitegelisa@gmail.com',
    expectedUrl: '/dashboard/tax-preparer',
  },
];

/**
 * Get test account by role
 */
export function getTestAccount(dbRole: string): TestAccount | undefined {
  return testAccounts.find((account) => account.dbRole === dbRole);
}

/**
 * Get all roles that are valid in the system
 */
export const validRoles = ['admin', 'tax_preparer', 'client', 'lead'] as const;

/**
 * Type for valid roles
 */
export type ValidRole = (typeof validRoles)[number];
