/**
 * Protected Actions Utility
 *
 * Wraps dangerous administrative operations to ensure they can only
 * be performed with actual admin privileges, not while viewing as another role
 */

import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/permissions';
import { getEffectiveRole } from './role-switcher';
import { logProtectedOperationAttempt } from '../services/audit-log.service';
import type { ProtectedOperation } from '@/types/role-switcher';
import { logger } from '@/lib/logger';

/**
 * Error thrown when protected operation is attempted while viewing as another role
 */
export class ProtectedOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public viewingRole: UserRole
  ) {
    super(message);
    this.name = 'ProtectedOperationError';
  }
}

/**
 * Check if current user has actual admin privileges (not viewing role)
 * Throws error if user is viewing as another role
 */
export async function requireActualAdminRole(operation: ProtectedOperation): Promise<{
  userId: string;
  email: string;
  actualRole: UserRole;
}> {
  const session = await auth(); const user = session?.user;

  if (!user) {
    throw new Error('Unauthorized - User not authenticated');
  }

  const actualRole = user?.role as UserRole;
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || 'unknown';

  // Check if user is actually an admin
  if (actualRole !== 'super_admin' && actualRole !== 'admin') {
    throw new Error('Forbidden - Admin privileges required');
  }

  // Check if admin is viewing as another role
  const roleInfo = await getEffectiveRole(actualRole, user.id);

  if (roleInfo.isViewingAsOtherRole) {
    // Log the blocked attempt
    await logProtectedOperationAttempt(user.id, email, operation, roleInfo.effectiveRole);

    throw new ProtectedOperationError(
      `This action requires actual admin privileges. You are currently viewing as ${roleInfo.viewingRoleName}. Please exit preview mode and try again.`,
      operation,
      roleInfo.effectiveRole
    );
  }

  return {
    userId: user.id,
    email,
    actualRole,
  };
}

/**
 * Wrapper for protected operations
 * Usage: const result = await protectedAction('delete_user', async () => { ... })
 */
export async function protectedAction<T>(
  operation: ProtectedOperation,
  action: (adminInfo: { userId: string; email: string; actualRole: UserRole }) => Promise<T>
): Promise<T> {
  const adminInfo = await requireActualAdminRole(operation);
  return await action(adminInfo);
}

/**
 * Check if user can perform protected operation (without throwing error)
 * Useful for UI to show/hide dangerous action buttons
 */
export async function canPerformProtectedOperation(
  operation: ProtectedOperation
): Promise<boolean> {
  try {
    await requireActualAdminRole(operation);
    return true;
  } catch (error) {
    if (error instanceof ProtectedOperationError) {
      return false;
    }
    // Re-throw non-protected-operation errors
    throw error;
  }
}

/**
 * Get viewing status for current user
 * Returns null if not viewing as another role
 */
export async function getViewingStatus(): Promise<{
  isViewing: boolean;
  actualRole?: UserRole;
  viewingRole?: UserRole;
  viewingRoleName?: string;
} | null> {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) return null;

    const actualRole = user?.role as UserRole;
    if (actualRole !== 'super_admin' && actualRole !== 'admin') {
      return null;
    }

    const roleInfo = await getEffectiveRole(actualRole, user.id);

    return {
      isViewing: roleInfo.isViewingAsOtherRole,
      actualRole: roleInfo.actualRole,
      viewingRole: roleInfo.effectiveRole,
      viewingRoleName: roleInfo.viewingRoleName,
    };
  } catch (error) {
    logger.error('Error getting viewing status:', error);
    return null;
  }
}

/**
 * Example Usage in API Routes:
 *
 * // Delete user endpoint
 * export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
 *   try {
 *     const result = await protectedAction('delete_user', async (adminInfo) => {
 *       // Only execute if admin has actual privileges (not viewing role)
 *       const deletedUser = await prisma.user.delete({
 *         where: { id: params.id }
 *       })
 *
 *       logger.info(`Admin ${adminInfo.email} deleted user ${params.id}`)
 *       return deletedUser
 *     })
 *
 *     return NextResponse.json({ success: true, data: result })
 *   } catch (error) {
 *     if (error instanceof ProtectedOperationError) {
 *       return NextResponse.json(
 *         { error: error.message },
 *         { status: 403 }
 *       )
 *     }
 *     throw error
 *   }
 * }
 */

/**
 * Example Usage in Server Components:
 *
 * // Check before rendering dangerous UI
 * const canDelete = await canPerformProtectedOperation('delete_user')
 *
 * return (
 *   <Button
 *     disabled={!canDelete}
 *     title={canDelete ? 'Delete user' : 'Exit preview mode to delete users'}
 *   >
 *     Delete User
 *   </Button>
 * )
 */

/**
 * Example Usage with Client Components:
 *
 * // Create an API endpoint to check viewing status
 * // GET /api/admin/viewing-status
 * export async function GET() {
 *   const status = await getViewingStatus()
 *   return NextResponse.json(status)
 * }
 *
 * // Client component
 * 'use client'
 * const { data: viewingStatus } = useSWR('/api/admin/viewing-status')
 *
 * if (viewingStatus?.isViewing) {
 *   return <Alert>Exit preview mode to perform this action</Alert>
 * }
 */
