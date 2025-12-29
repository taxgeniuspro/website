/**
 * Saved Reply Service
 * Manages canned response templates with variable substitution
 * Supports common tax-related question templates
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface SavedReplyRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  isGlobal: boolean;
  createdById: string;
  usageCount: number;
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
  createdBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  creatorId: string;
  assignedToId?: string | null;
}

// ==================== Types ====================

export interface CreateSavedReplyInput {
  title: string;
  content: string;
  category?: string;
  isGlobal?: boolean;
  createdById: string;
}

export interface UpdateSavedReplyInput {
  title?: string;
  content?: string;
  category?: string;
  isGlobal?: boolean;
}

export interface ApplySavedReplyInput {
  replyId: string;
  ticketId: string;
  variables?: Record<string, string>;
}

// ==================== Saved Reply Management ====================

/**
 * Create a new saved reply template
 */
export async function createSavedReply(input: CreateSavedReplyInput) {
  try {
    const { data: savedReplyData, error } = await db
      .from('saved_replies')
      .insert({
        title: input.title,
        content: input.content,
        category: input.category || 'general',
        isGlobal: input.isGlobal || false,
        createdById: input.createdById,
      })
      .select()
      .single();

    if (error || !savedReplyData) {
      throw new Error(`Failed to create saved reply: ${error?.message}`);
    }

    // Get creator info
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', input.createdById)
      .limit(1);

    const savedReply = {
      ...savedReplyData,
      createdBy: firstOrNull(creatorData) as ProfileRecord | null,
    } as SavedReplyRecord;

    logger.info('Saved reply created', {
      savedReplyId: savedReply.id,
      title: savedReply.title,
      createdById: input.createdById,
    });

    return savedReply;
  } catch (error) {
    logger.error('Failed to create saved reply', {
      error,
      input,
    });
    throw new Error('Failed to create saved reply');
  }
}

/**
 * Get saved replies for a user (their own + global ones)
 */
export async function getSavedReplies(
  userId: string,
  filters?: {
    category?: string;
    search?: string;
  }
) {
  try {
    // Supabase doesn't support OR in where clause directly, so we fetch user's replies and global ones separately
    // Then combine and filter in JS

    // Get user's own replies
    let userQuery = db
      .from('saved_replies')
      .select('*')
      .eq('createdById', userId);

    if (filters?.category) {
      userQuery = userQuery.eq('category', filters.category);
    }

    const { data: userRepliesData } = await userQuery;

    // Get global replies
    let globalQuery = db
      .from('saved_replies')
      .select('*')
      .eq('isGlobal', true)
      .neq('createdById', userId); // Exclude user's own to avoid duplicates

    if (filters?.category) {
      globalQuery = globalQuery.eq('category', filters.category);
    }

    const { data: globalRepliesData } = await globalQuery;

    // Combine results
    let allReplies = [...(userRepliesData || []), ...(globalRepliesData || [])] as SavedReplyRecord[];

    // Apply search filter in JS (case-insensitive)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      allReplies = allReplies.filter(
        (r) =>
          r.title.toLowerCase().includes(searchLower) ||
          r.content.toLowerCase().includes(searchLower)
      );
    }

    // Get creator info for all replies
    const creatorIds = [...new Set(allReplies.map((r) => r.createdById))];
    const { data: creatorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', creatorIds);

    const creatorsMap = new Map<string, ProfileRecord>();
    for (const creator of (creatorsData || []) as ProfileRecord[]) {
      creatorsMap.set(creator.id, creator);
    }

    // Attach creator info
    const repliesWithCreators = allReplies.map((r) => ({
      ...r,
      createdBy: creatorsMap.get(r.createdById) || null,
    }));

    // Sort: usageCount desc, lastUsedAt desc, createdAt desc
    repliesWithCreators.sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      const aLastUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bLastUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      if (bLastUsed !== aLastUsed) return bLastUsed - aLastUsed;
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      return bCreated - aCreated;
    });

    return repliesWithCreators;
  } catch (error) {
    logger.error('Failed to get saved replies', {
      error,
      userId,
    });
    throw new Error('Failed to get saved replies');
  }
}

/**
 * Get all available categories
 */
export async function getSavedReplyCategories() {
  try {
    const { data: repliesData } = await db
      .from('saved_replies')
      .select('category')
      .order('category', { ascending: true });

    // Get distinct categories in JS
    const categoriesSet = new Set<string>();
    for (const r of (repliesData || []) as Array<{ category: string }>) {
      if (r.category) {
        categoriesSet.add(r.category);
      }
    }

    return Array.from(categoriesSet).sort();
  } catch (error) {
    logger.error('Failed to get saved reply categories', { error });
    return [];
  }
}

/**
 * Update a saved reply
 */
export async function updateSavedReply(replyId: string, input: UpdateSavedReplyInput) {
  try {
    const { data: savedReplyData, error } = await db
      .from('saved_replies')
      .update(input)
      .eq('id', replyId)
      .select()
      .single();

    if (error || !savedReplyData) {
      throw new Error(`Failed to update saved reply: ${error?.message}`);
    }

    // Get creator info
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', savedReplyData.createdById)
      .limit(1);

    const savedReply = {
      ...savedReplyData,
      createdBy: firstOrNull(creatorData) as ProfileRecord | null,
    } as SavedReplyRecord;

    logger.info('Saved reply updated', {
      savedReplyId: replyId,
      updates: input,
    });

    return savedReply;
  } catch (error) {
    logger.error('Failed to update saved reply', {
      error,
      replyId,
      input,
    });
    throw new Error('Failed to update saved reply');
  }
}

/**
 * Delete a saved reply
 */
export async function deleteSavedReply(replyId: string, userId: string) {
  try {
    // Ensure user owns this reply or is admin
    const { data: replyData } = await db
      .from('saved_replies')
      .select('createdById')
      .eq('id', replyId)
      .limit(1);

    const reply = firstOrNull(replyData) as { createdById: string } | null;

    if (!reply) {
      throw new Error('Saved reply not found');
    }

    if (reply.createdById !== userId) {
      throw new Error('Unauthorized to delete this saved reply');
    }

    const { error } = await db
      .from('saved_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      throw new Error(`Failed to delete saved reply: ${error.message}`);
    }

    logger.info('Saved reply deleted', {
      savedReplyId: replyId,
      userId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete saved reply', {
      error,
      replyId,
    });
    throw error;
  }
}

/**
 * Apply a saved reply to a ticket with variable substitution
 * Variables: {{client_name}}, {{preparer_name}}, {{ticket_number}}, {{today}}, etc.
 */
export async function applySavedReply(input: ApplySavedReplyInput) {
  try {
    // Get the saved reply
    const { data: savedReplyData } = await db
      .from('saved_replies')
      .select('*')
      .eq('id', input.replyId)
      .limit(1);

    const savedReply = firstOrNull(savedReplyData) as SavedReplyRecord | null;

    if (!savedReply) {
      throw new Error('Saved reply not found');
    }

    // Get ticket details for variable substitution
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('id, ticketNumber, creatorId, assignedToId')
      .eq('id', input.ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as SupportTicketRecord | null;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get creator info
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', ticket.creatorId)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    // Get assigned preparer info (if any)
    let assignedTo: ProfileRecord | null = null;
    if (ticket.assignedToId) {
      const { data: assignedData } = await db
        .from('profiles')
        .select('id, firstName, lastName')
        .eq('id', ticket.assignedToId)
        .limit(1);

      assignedTo = firstOrNull(assignedData) as ProfileRecord | null;
    }

    // Perform variable substitution
    const content = substituteVariables(savedReply.content, {
      client_name: `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim(),
      preparer_name: assignedTo
        ? `${assignedTo.firstName || ''} ${assignedTo.lastName || ''}`.trim()
        : 'Tax Preparer',
      ticket_number: ticket.ticketNumber,
      today: new Date().toLocaleDateString(),
      ...input.variables,
    });

    // Update usage statistics
    await db
      .from('saved_replies')
      .update({
        usageCount: savedReply.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      })
      .eq('id', input.replyId);

    logger.info('Saved reply applied', {
      savedReplyId: input.replyId,
      ticketId: input.ticketId,
    });

    return { content };
  } catch (error) {
    logger.error('Failed to apply saved reply', {
      error,
      input,
    });
    throw error;
  }
}

/**
 * Substitute variables in template content
 * Supports: {{variable_name}} format
 */
function substituteVariables(content: string, variables: Record<string, string>): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}

/**
 * Get saved reply by ID
 */
export async function getSavedReplyById(replyId: string) {
  try {
    const { data: savedReplyData } = await db
      .from('saved_replies')
      .select('*')
      .eq('id', replyId)
      .limit(1);

    const savedReply = firstOrNull(savedReplyData) as SavedReplyRecord | null;

    if (!savedReply) {
      return null;
    }

    // Get creator info
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', savedReply.createdById)
      .limit(1);

    return {
      ...savedReply,
      createdBy: firstOrNull(creatorData) as ProfileRecord | null,
    } as SavedReplyRecord;
  } catch (error) {
    logger.error('Failed to get saved reply by ID', {
      error,
      replyId,
    });
    throw new Error('Failed to get saved reply');
  }
}

/**
 * Get most used saved replies for analytics
 */
export async function getTopSavedReplies(userId?: string, limit = 10) {
  try {
    let allReplies: SavedReplyRecord[] = [];

    if (userId) {
      // Supabase doesn't support OR in where clause directly, so we fetch separately
      const { data: userRepliesData } = await db
        .from('saved_replies')
        .select('*')
        .eq('createdById', userId)
        .order('usageCount', { ascending: false })
        .limit(limit);

      const { data: globalRepliesData } = await db
        .from('saved_replies')
        .select('*')
        .eq('isGlobal', true)
        .neq('createdById', userId)
        .order('usageCount', { ascending: false })
        .limit(limit);

      allReplies = [...(userRepliesData || []), ...(globalRepliesData || [])] as SavedReplyRecord[];
    } else {
      const { data: repliesData } = await db
        .from('saved_replies')
        .select('*')
        .order('usageCount', { ascending: false })
        .limit(limit);

      allReplies = (repliesData || []) as SavedReplyRecord[];
    }

    // Sort and limit combined results
    allReplies.sort((a, b) => b.usageCount - a.usageCount);
    allReplies = allReplies.slice(0, limit);

    // Get creator info for all replies
    const creatorIds = [...new Set(allReplies.map((r) => r.createdById))];
    const { data: creatorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', creatorIds);

    const creatorsMap = new Map<string, ProfileRecord>();
    for (const creator of (creatorsData || []) as ProfileRecord[]) {
      creatorsMap.set(creator.id, creator);
    }

    // Attach creator info
    const topReplies = allReplies.map((r) => ({
      ...r,
      createdBy: creatorsMap.get(r.createdById) || null,
    }));

    return topReplies;
  } catch (error) {
    logger.error('Failed to get top saved replies', {
      error,
      userId,
    });
    return [];
  }
}

/**
 * Extract available variables from template content
 */
export function extractVariables(content: string): string[] {
  const regex = /{{(.*?)}}/g;
  const matches = content.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Get default saved reply templates for tax preparers
 */
export function getDefaultTemplates() {
  return [
    {
      title: 'Welcome - New Client',
      category: 'onboarding',
      content: `Hello {{client_name}},\n\nThank you for reaching out to Tax Genius Pro! I'm {{preparer_name}}, and I'll be assisting you with your tax preparation needs.\n\nI've reviewed your ticket ({{ticket_number}}) and I'm ready to help. Please feel free to upload any relevant documents or ask any questions you may have.\n\nLooking forward to working with you!\n\nBest regards,\n{{preparer_name}}`,
    },
    {
      title: 'Request Missing Documents',
      category: 'document-requests',
      content: `Hi {{client_name}},\n\nI'm working on your tax return and need a few additional documents to proceed:\n\n- [List specific documents needed]\n\nPlease upload these documents at your earliest convenience so we can move forward with your filing.\n\nThank you!`,
    },
    {
      title: 'Deduction Explanation',
      category: 'tax-deductions',
      content: `Hi {{client_name}},\n\nRegarding your question about deductions:\n\n[Explain the specific deduction]\n\nTo claim this deduction, you'll need:\n- [List requirements]\n\nLet me know if you have any questions!`,
    },
    {
      title: 'Filing Status Clarification',
      category: 'filing-status',
      content: `Hello {{client_name}},\n\nBased on your situation, here's what you need to know about your filing status:\n\n[Explain filing status options]\n\nI recommend [suggested status] because [reason].\n\nPlease confirm if you'd like to proceed with this recommendation.`,
    },
    {
      title: 'Deadline Reminder',
      category: 'deadlines',
      content: `Hi {{client_name}},\n\nJust a friendly reminder that the tax filing deadline is approaching on [date].\n\nTo ensure timely filing, please:\n1. Review the documents we've prepared\n2. Provide any missing information\n3. Approve the return for e-filing\n\nLet me know if you need any assistance!`,
    },
    {
      title: 'Ticket Resolved',
      category: 'resolution',
      content: `Hi {{client_name}},\n\nI'm marking this ticket as resolved. If you have any additional questions or concerns, please don't hesitate to reopen this ticket or create a new one.\n\nThank you for choosing Tax Genius Pro!\n\nBest regards,\n{{preparer_name}}`,
    },
  ];
}
