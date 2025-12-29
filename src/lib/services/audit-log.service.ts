/**
 * Audit Log Service
 *
 * Tracks admin role switching and other sensitive operations
 * for security monitoring and compliance
 */

import { db, firstOrNull } from '@/lib/db';
import { UserRole } from '@/lib/permissions';
import type { RoleSwitchAuditLog } from '@/types/role-switcher';
import { logger } from '@/lib/logger';

// Local type definitions
interface AuditLogRecord {
  id: string;
  type: string;
  userId: string;
  userEmail: string;
  fromRole?: string | null;
  toRole?: string | null;
  operation?: string | null;
  viewingRole?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Log a role switch event
 */
export async function logRoleSwitch(
  adminUserId: string,
  adminEmail: string,
  fromRole: UserRole,
  toRole: UserRole,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const logEntry: RoleSwitchAuditLog = {
    id: generateAuditId(),
    adminUserId,
    adminEmail,
    fromRole,
    toRole,
    timestamp: new Date(),
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  };

  // Console logging for development
  logger.info('Audit Log - Role Switch:', {
    admin: adminEmail,
    from: fromRole,
    to: toRole,
    timestamp: logEntry.timestamp.toISOString(),
    ip: logEntry.ipAddress,
  });

  // Store in database
  try {
    await db.from('audit_logs').insert({
      id: logEntry.id,
      type: 'ROLE_SWITCH',
      userId: adminUserId,
      userEmail: adminEmail,
      fromRole,
      toRole,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to store audit log', { error, logEntry });
  }
}

/**
 * Log a protected operation attempt
 * Used when admin tries to perform dangerous operation while viewing as another role
 */
export async function logProtectedOperationAttempt(
  adminUserId: string,
  adminEmail: string,
  operation: string,
  viewingRole: UserRole,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    resourceId?: string;
  }
): Promise<void> {
  logger.info('Audit Log - Protected Operation Blocked:', {
    admin: adminEmail,
    operation,
    viewingRole,
    timestamp: new Date().toISOString(),
    resourceId: metadata?.resourceId,
  });

  // Store in database
  try {
    await db.from('audit_logs').insert({
      id: generateAuditId(),
      type: 'PROTECTED_OPERATION_BLOCKED',
      userId: adminUserId,
      userEmail: adminEmail,
      operation,
      viewingRole,
      resourceId: metadata?.resourceId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to store audit log', { error });
  }
}

/**
 * Get audit logs for a specific admin
 */
export async function getAuditLogsForAdmin(
  adminUserId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<RoleSwitchAuditLog[]> {
  logger.info('Fetching audit logs for admin:', adminUserId, options);

  try {
    let query = db
      .from('audit_logs')
      .select('*')
      .eq('userId', adminUserId)
      .order('timestamp', { ascending: false });

    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: logsData } = await query;
    const logs = (logsData || []) as AuditLogRecord[];

    return logs.map((log) => ({
      id: log.id,
      adminUserId: log.userId,
      adminEmail: log.userEmail,
      fromRole: (log.fromRole || 'super_admin') as UserRole,
      toRole: (log.toRole || 'super_admin') as UserRole,
      timestamp: new Date(log.timestamp),
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
    }));
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error, adminUserId });
    return [];
  }
}

/**
 * Get all audit logs (admin view)
 */
export async function getAllAuditLogs(options?: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  type?: string;
}): Promise<RoleSwitchAuditLog[]> {
  logger.info('Fetching all audit logs:', options);

  try {
    let query = db
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options?.userId) {
      query = query.eq('userId', options.userId);
    }
    if (options?.type) {
      query = query.eq('type', options.type);
    }
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: logsData } = await query;
    const logs = (logsData || []) as AuditLogRecord[];

    return logs.map((log) => ({
      id: log.id,
      adminUserId: log.userId,
      adminEmail: log.userEmail,
      fromRole: (log.fromRole || 'super_admin') as UserRole,
      toRole: (log.toRole || 'super_admin') as UserRole,
      timestamp: new Date(log.timestamp),
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
    }));
  } catch (error) {
    logger.error('Failed to fetch all audit logs', { error });
    return [];
  }
}

/**
 * Generate a unique audit log ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get statistics about audit logs
 */
export async function getAuditLogStats(options?: { startDate?: Date; endDate?: Date }): Promise<{
  totalEvents: number;
  roleSwitchEvents: number;
  protectedOperationAttempts: number;
  uniqueAdmins: number;
}> {
  logger.info('Fetching audit log statistics:', options);

  try {
    let baseQuery = db.from('audit_logs').select('type, userId');

    if (options?.startDate) {
      baseQuery = baseQuery.gte('timestamp', options.startDate.toISOString());
    }
    if (options?.endDate) {
      baseQuery = baseQuery.lte('timestamp', options.endDate.toISOString());
    }

    const { data: logsData } = await baseQuery;
    const logs = (logsData || []) as { type: string; userId: string }[];

    const uniqueAdmins = new Set(logs.map((l) => l.userId)).size;
    const roleSwitchEvents = logs.filter((l) => l.type === 'ROLE_SWITCH').length;
    const protectedOperationAttempts = logs.filter((l) => l.type === 'PROTECTED_OPERATION_BLOCKED').length;

    return {
      totalEvents: logs.length,
      roleSwitchEvents,
      protectedOperationAttempts,
      uniqueAdmins,
    };
  } catch (error) {
    logger.error('Failed to get audit log stats', { error });
    return {
      totalEvents: 0,
      roleSwitchEvents: 0,
      protectedOperationAttempts: 0,
      uniqueAdmins: 0,
    };
  }
}

/**
 * Supabase Table Schema:
 *
 * CREATE TABLE audit_logs (
 *   id TEXT PRIMARY KEY,
 *   type TEXT NOT NULL,  -- 'ROLE_SWITCH' | 'PROTECTED_OPERATION_BLOCKED' | etc.
 *   "userId" TEXT NOT NULL,
 *   "userEmail" TEXT NOT NULL,
 *   "fromRole" TEXT,
 *   "toRole" TEXT,
 *   operation TEXT,
 *   "viewingRole" TEXT,
 *   "resourceId" TEXT,
 *   "ipAddress" TEXT,
 *   "userAgent" TEXT,
 *   timestamp TIMESTAMPTZ DEFAULT NOW(),
 *   metadata JSONB,
 *   CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES profiles(id)
 * );
 *
 * CREATE INDEX idx_audit_logs_user ON audit_logs("userId");
 * CREATE INDEX idx_audit_logs_type ON audit_logs(type);
 * CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
 */
