/**
 * Cloudflare Email Routing Service
 *
 * Manages email forwarding rules using Cloudflare Email Routing API
 * Docs: https://developers.cloudflare.com/email-routing/
 *
 * Features:
 * - Create forwarding rules (e.g., ira@taxgeniuspro.tax → ira.johnson@gmail.com)
 * - Verify forwarding is working
 * - Delete forwarding rules
 * - List all forwarding rules
 *
 * Requirements:
 * - CLOUDFLARE_API_KEY (API token with Email Routing permissions)
 * - CLOUDFLARE_ZONE_ID (Zone ID for taxgeniuspro.tax)
 * - CLOUDFLARE_ACCOUNT_ID (Cloudflare account ID)
 */

import { logger } from '@/lib/logger';

// Cloudflare API Configuration
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareConfig {
  apiKey: string;
  zoneId: string;
  accountId: string;
}

/**
 * Get Cloudflare configuration from environment
 */
function getCloudflareConfig(): CloudflareConfig {
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiKey || !zoneId || !accountId) {
    throw new Error(
      'Missing Cloudflare configuration. Set CLOUDFLARE_API_KEY, CLOUDFLARE_ZONE_ID, and CLOUDFLARE_ACCOUNT_ID'
    );
  }

  return { apiKey, zoneId, accountId };
}

/**
 * Make authenticated request to Cloudflare API
 */
async function cloudflareRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getCloudflareConfig();

  const response = await fetch(`${CLOUDFLARE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!data.success) {
    const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return data.result;
}

/**
 * Email forwarding rule result
 */
export interface ForwardingRule {
  id: string;
  tag: string;
  name: string;
  enabled: boolean;
  matchers: Array<{
    type: string;
    field: string;
    value: string;
  }>;
  actions: Array<{
    type: string;
    value: string[];
  }>;
  priority: number;
  created: string;
  modified: string;
}

/**
 * Result of creating a forwarding rule
 */
export interface CreateForwardingRuleResult {
  success: boolean;
  ruleId: string;
  message: string;
}

/**
 * Cloudflare Email Routing Service
 */
export class CloudflareEmailService {
  /**
   * Create a new email forwarding rule
   *
   * @param sourceEmail - Email to forward FROM (e.g., "ira@taxgeniuspro.tax")
   * @param destinationEmail - Email to forward TO (e.g., "ira.johnson@gmail.com")
   * @param displayName - Optional display name for the rule
   * @returns Result with ruleId for tracking
   *
   * @example
   * const result = await cloudflareService.createForwardingRule(
   *   'ira@taxgeniuspro.tax',
   *   'ira.johnson@gmail.com',
   *   'Ira Johnson'
   * );
   */
  async createForwardingRule(
    sourceEmail: string,
    destinationEmail: string,
    displayName?: string
  ): Promise<CreateForwardingRuleResult> {
    try {
      const config = getCloudflareConfig();

      // Extract username from email (e.g., "ira" from "ira@taxgeniuspro.tax")
      const username = sourceEmail.split('@')[0];
      const ruleName = displayName
        ? `${displayName} (${username})`
        : `Forward ${username}`;

      logger.info('Creating Cloudflare forwarding rule', {
        sourceEmail,
        destinationEmail,
        ruleName,
      });

      // Create forwarding rule
      // API: POST /zones/:zone_id/email/routing/rules
      const rule = await cloudflareRequest<ForwardingRule>(
        `/zones/${config.zoneId}/email/routing/rules`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: ruleName,
            enabled: true,
            matchers: [
              {
                type: 'literal',
                field: 'to',
                value: sourceEmail,
              },
            ],
            actions: [
              {
                type: 'forward',
                value: [destinationEmail],
              },
            ],
            priority: 0,
          }),
        }
      );

      logger.info('Cloudflare forwarding rule created successfully', {
        ruleId: rule.id,
        sourceEmail,
        destinationEmail,
      });

      return {
        success: true,
        ruleId: rule.id,
        message: 'Forwarding rule created successfully',
      };
    } catch (error) {
      logger.error('Failed to create Cloudflare forwarding rule', {
        sourceEmail,
        destinationEmail,
        error,
      });

      return {
        success: false,
        ruleId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify that a forwarding rule exists and is active
   *
   * @param ruleId - Cloudflare rule ID
   * @returns True if rule exists and is enabled
   */
  async verifyForwarding(ruleId: string): Promise<boolean> {
    try {
      const config = getCloudflareConfig();

      logger.info('Verifying Cloudflare forwarding rule', { ruleId });

      // Get rule details
      // API: GET /zones/:zone_id/email/routing/rules/:rule_id
      const rule = await cloudflareRequest<ForwardingRule>(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`
      );

      const isActive = rule.enabled;

      logger.info('Cloudflare forwarding rule verification complete', {
        ruleId,
        enabled: isActive,
      });

      return isActive;
    } catch (error) {
      logger.error('Failed to verify Cloudflare forwarding rule', {
        ruleId,
        error,
      });
      return false;
    }
  }

  /**
   * Delete a forwarding rule
   *
   * @param ruleId - Cloudflare rule ID to delete
   */
  async deleteForwardingRule(ruleId: string): Promise<void> {
    try {
      const config = getCloudflareConfig();

      logger.info('Deleting Cloudflare forwarding rule', { ruleId });

      // Delete rule
      // API: DELETE /zones/:zone_id/email/routing/rules/:rule_id
      await cloudflareRequest(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`,
        {
          method: 'DELETE',
        }
      );

      logger.info('Cloudflare forwarding rule deleted successfully', { ruleId });
    } catch (error) {
      logger.error('Failed to delete Cloudflare forwarding rule', {
        ruleId,
        error,
      });
      throw error;
    }
  }

  /**
   * List all forwarding rules for the zone
   *
   * @returns Array of forwarding rules
   */
  async listForwardingRules(): Promise<ForwardingRule[]> {
    try {
      const config = getCloudflareConfig();

      logger.info('Listing Cloudflare forwarding rules');

      // List all rules
      // API: GET /zones/:zone_id/email/routing/rules
      const rules = await cloudflareRequest<ForwardingRule[]>(
        `/zones/${config.zoneId}/email/routing/rules`
      );

      logger.info('Cloudflare forwarding rules retrieved', {
        count: rules.length,
      });

      return rules;
    } catch (error) {
      logger.error('Failed to list Cloudflare forwarding rules', { error });
      return [];
    }
  }

  /**
   * Update a forwarding rule's destination
   *
   * @param ruleId - Cloudflare rule ID
   * @param newDestinationEmail - New destination email address
   */
  async updateForwardingDestination(
    ruleId: string,
    newDestinationEmail: string
  ): Promise<boolean> {
    try {
      const config = getCloudflareConfig();

      logger.info('Updating Cloudflare forwarding rule destination', {
        ruleId,
        newDestinationEmail,
      });

      // Get current rule to preserve other settings
      const currentRule = await cloudflareRequest<ForwardingRule>(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`
      );

      // Update rule with new destination
      // API: PUT /zones/:zone_id/email/routing/rules/:rule_id
      await cloudflareRequest(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: currentRule.name,
            enabled: currentRule.enabled,
            matchers: currentRule.matchers,
            actions: [
              {
                type: 'forward',
                value: [newDestinationEmail],
              },
            ],
            priority: currentRule.priority,
          }),
        }
      );

      logger.info('Cloudflare forwarding rule destination updated successfully', {
        ruleId,
        newDestinationEmail,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update Cloudflare forwarding rule destination', {
        ruleId,
        newDestinationEmail,
        error,
      });
      return false;
    }
  }

  /**
   * Enable or disable a forwarding rule
   *
   * @param ruleId - Cloudflare rule ID
   * @param enabled - True to enable, false to disable
   */
  async setForwardingEnabled(ruleId: string, enabled: boolean): Promise<boolean> {
    try {
      const config = getCloudflareConfig();

      logger.info('Updating Cloudflare forwarding rule status', {
        ruleId,
        enabled,
      });

      // Get current rule
      const currentRule = await cloudflareRequest<ForwardingRule>(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`
      );

      // Update rule enabled status
      await cloudflareRequest(
        `/zones/${config.zoneId}/email/routing/rules/${ruleId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            ...currentRule,
            enabled,
          }),
        }
      );

      logger.info('Cloudflare forwarding rule status updated successfully', {
        ruleId,
        enabled,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update Cloudflare forwarding rule status', {
        ruleId,
        enabled,
        error,
      });
      return false;
    }
  }

  /**
   * Check if email routing is enabled for the zone
   * This should be run during setup to ensure Cloudflare Email Routing is configured
   */
  async isEmailRoutingEnabled(): Promise<boolean> {
    try {
      const config = getCloudflareConfig();

      logger.info('Checking if Cloudflare Email Routing is enabled');

      // Get email routing settings
      // API: GET /zones/:zone_id/email/routing
      const settings = await cloudflareRequest<{ enabled: boolean }>(
        `/zones/${config.zoneId}/email/routing`
      );

      logger.info('Cloudflare Email Routing status', {
        enabled: settings.enabled,
      });

      return settings.enabled;
    } catch (error) {
      logger.error('Failed to check Cloudflare Email Routing status', { error });
      return false;
    }
  }
}

// Singleton instance
export const cloudflareEmailService = new CloudflareEmailService();
