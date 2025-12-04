/**
 * Saved Reply Service
 * Manages canned response templates with variable substitution
 * Supports common tax-related question templates
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const savedReply = await prisma.savedReply.create({
      data: {
        title: input.title,
        content: input.content,
        category: input.category || 'general',
        isGlobal: input.isGlobal || false,
        createdById: input.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

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
    const where: any = {
      OR: [
        { createdById: userId }, // User's own replies
        { isGlobal: true }, // Global replies available to all
      ],
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.AND = [
        where,
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { content: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const savedReplies = await prisma.savedReply.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return savedReplies;
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
    const categories = await prisma.savedReply.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return categories.map((c) => c.category).filter(Boolean);
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
    const savedReply = await prisma.savedReply.update({
      where: { id: replyId },
      data: input,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

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
    const reply = await prisma.savedReply.findUnique({
      where: { id: replyId },
      select: { createdById: true },
    });

    if (!reply) {
      throw new Error('Saved reply not found');
    }

    if (reply.createdById !== userId) {
      throw new Error('Unauthorized to delete this saved reply');
    }

    await prisma.savedReply.delete({
      where: { id: replyId },
    });

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
    const savedReply = await prisma.savedReply.findUnique({
      where: { id: input.replyId },
    });

    if (!savedReply) {
      throw new Error('Saved reply not found');
    }

    // Get ticket details for variable substitution
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      include: {
        creator: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Perform variable substitution
    const content = substituteVariables(savedReply.content, {
      client_name: `${ticket.creator.firstName || ''} ${ticket.creator.lastName || ''}`.trim(),
      preparer_name: ticket.assignedTo
        ? `${ticket.assignedTo.firstName || ''} ${ticket.assignedTo.lastName || ''}`.trim()
        : 'Tax Preparer',
      ticket_number: ticket.ticketNumber,
      today: new Date().toLocaleDateString(),
      ...input.variables,
    });

    // Update usage statistics
    await prisma.savedReply.update({
      where: { id: input.replyId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

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
    const savedReply = await prisma.savedReply.findUnique({
      where: { id: replyId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return savedReply;
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
    const where: any = {};

    if (userId) {
      where.OR = [{ createdById: userId }, { isGlobal: true }];
    }

    const topReplies = await prisma.savedReply.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        usageCount: 'desc',
      },
      take: limit,
    });

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
