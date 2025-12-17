/**
 * Lead Status Transition Validation Service
 *
 * Enforces valid state machine transitions for lead statuses.
 * Prevents data corruption from invalid status changes.
 */

import { LeadStatus } from '@prisma/client';

/**
 * Valid status transitions for leads.
 * Each status maps to an array of statuses it can transition TO.
 * Empty array = terminal state (no transitions allowed)
 */
const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: [LeadStatus.CONTACTED, LeadStatus.DISQUALIFIED],
  CONTACTED: [LeadStatus.QUALIFIED, LeadStatus.DISQUALIFIED],
  QUALIFIED: [LeadStatus.CONVERTED, LeadStatus.DISQUALIFIED],
  CONVERTED: [], // Terminal state - cannot change once converted
  DISQUALIFIED: [], // Terminal state - cannot change once disqualified
};

/**
 * Human-readable descriptions for error messages
 */
const STATUS_DESCRIPTIONS: Record<LeadStatus, string> = {
  NEW: 'New lead awaiting contact',
  CONTACTED: 'Lead has been contacted',
  QUALIFIED: 'Lead is qualified and ready for conversion',
  CONVERTED: 'Lead has been converted to a client',
  DISQUALIFIED: 'Lead has been disqualified',
};

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  allowedTransitions?: LeadStatus[];
}

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(
  from: LeadStatus,
  to: LeadStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate a status transition with detailed error message
 */
export function validateStatusTransition(
  from: LeadStatus,
  to: LeadStatus
): TransitionValidationResult {
  // Same status is always valid (no-op)
  if (from === to) {
    return { valid: true };
  }

  const allowedTransitions = VALID_TRANSITIONS[from] ?? [];

  // Check if transition is valid
  if (allowedTransitions.includes(to)) {
    return { valid: true, allowedTransitions };
  }

  // Terminal state check
  if (allowedTransitions.length === 0) {
    return {
      valid: false,
      error: `Cannot change status from ${from}. This is a terminal state (${STATUS_DESCRIPTIONS[from]}).`,
      allowedTransitions: [],
    };
  }

  // Invalid transition
  return {
    valid: false,
    error: `Invalid status transition from ${from} to ${to}. Allowed transitions: ${allowedTransitions.join(', ')}`,
    allowedTransitions,
  };
}

/**
 * Get all valid transitions for a given status
 */
export function getValidTransitions(status: LeadStatus): LeadStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: LeadStatus): boolean {
  return (VALID_TRANSITIONS[status]?.length ?? 0) === 0;
}

/**
 * Get human-readable description of a status
 */
export function getStatusDescription(status: LeadStatus): string {
  return STATUS_DESCRIPTIONS[status] ?? status;
}
