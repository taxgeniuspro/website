/**
 * Tax Assistant Service - OpenAI Integration
 *
 * Provides tax form assistance to tax preparers using OpenAI's Assistants API
 * with file search capabilities for IRS form knowledge base.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant configuration
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || '';

export interface CreateThreadParams {
  userId: string;
  initialMessage?: string;
}

export interface SendMessageParams {
  threadId: string;
  userId: string;
  message: string;
}

export interface ThreadResponse {
  threadId: string;
  openaiThreadId: string;
  messages: MessageResponse[];
}

export interface MessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  formReferences: string[];
  createdAt: Date;
}

/**
 * Create a new conversation thread
 */
export async function createThread(params: CreateThreadParams): Promise<ThreadResponse> {
  const { userId, initialMessage } = params;

  try {
    // Create OpenAI thread
    const thread = await openai.beta.threads.create();

    // Store thread in database
    const dbThread = await prisma.taxAssistantThread.create({
      data: {
        userId,
        openaiThreadId: thread.id,
        openaiAssistantId: ASSISTANT_ID,
        title: initialMessage ? initialMessage.substring(0, 100) : 'New Conversation',
      },
    });

    // If initial message provided, send it
    let messages: MessageResponse[] = [];
    if (initialMessage) {
      const response = await sendMessage({
        threadId: dbThread.id,
        userId,
        message: initialMessage,
      });
      messages = response.messages;
    }

    return {
      threadId: dbThread.id,
      openaiThreadId: thread.id,
      messages,
    };
  } catch (error) {
    logger.error('Error creating thread:', error);
    throw new Error('Failed to create conversation thread');
  }
}

/**
 * Send a message and get assistant response
 */
export async function sendMessage(params: SendMessageParams): Promise<ThreadResponse> {
  const { threadId, userId, message } = params;

  try {
    // Get thread from database
    const dbThread = await prisma.taxAssistantThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!dbThread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (dbThread.userId !== userId) {
      throw new Error('Unauthorized access to thread');
    }

    // Add message to OpenAI thread
    await openai.beta.threads.messages.create(dbThread.openaiThreadId, {
      role: 'user',
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(dbThread.openaiThreadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(dbThread.openaiThreadId, run.id);

    // Poll until complete (with timeout)
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      if (
        runStatus.status === 'failed' ||
        runStatus.status === 'cancelled' ||
        runStatus.status === 'expired'
      ) {
        throw new Error(`Assistant run ${runStatus.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(dbThread.openaiThreadId, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant response timeout');
    }

    // Get messages from OpenAI
    const messagesResponse = await openai.beta.threads.messages.list(dbThread.openaiThreadId);

    // Get the latest messages (user + assistant response)
    const latestMessages = messagesResponse.data.slice(0, 2).reverse();

    // Save messages to database
    const savedMessages: MessageResponse[] = [];
    for (const msg of latestMessages) {
      const contentText = msg.content
        .filter((c) => c.type === 'text')
        .map((c) => ('text' in c ? c.text.value : ''))
        .join('\n');

      // Extract form references from assistant response
      const formReferences = extractFormReferences(contentText);

      const saved = await prisma.taxAssistantMessage.create({
        data: {
          threadId: dbThread.id,
          openaiMessageId: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: contentText,
          formReferences,
          tokensUsed: 0, // OpenAI doesn't provide per-message tokens
        },
      });

      savedMessages.push({
        id: saved.id,
        role: saved.role as 'user' | 'assistant',
        content: saved.content,
        formReferences: saved.formReferences,
        createdAt: saved.createdAt,
      });
    }

    // Update thread metadata
    await prisma.taxAssistantThread.update({
      where: { id: dbThread.id },
      data: {
        lastMessage: message.substring(0, 500),
        messageCount: { increment: 2 }, // User + assistant
        lastMessageAt: new Date(),
        tokensUsed: { increment: runStatus.usage?.total_tokens || 0 },
      },
    });

    // Get all messages for response
    const allMessages = await prisma.taxAssistantMessage.findMany({
      where: { threadId: dbThread.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      threadId: dbThread.id,
      openaiThreadId: dbThread.openaiThreadId,
      messages: allMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        formReferences: msg.formReferences,
        createdAt: msg.createdAt,
      })),
    };
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Get thread history
 */
export async function getThread(threadId: string, userId: string): Promise<ThreadResponse> {
  const dbThread = await prisma.taxAssistantThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!dbThread) {
    throw new Error('Thread not found');
  }

  // Verify ownership
  if (dbThread.userId !== userId) {
    throw new Error('Unauthorized access to thread');
  }

  return {
    threadId: dbThread.id,
    openaiThreadId: dbThread.openaiThreadId,
    messages: dbThread.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      formReferences: msg.formReferences,
      createdAt: msg.createdAt,
    })),
  };
}

/**
 * List all threads for a user
 */
export async function listThreads(userId: string) {
  const threads = await prisma.taxAssistantThread.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title || 'Untitled Conversation',
    lastMessage: thread.lastMessage,
    messageCount: thread.messageCount,
    lastMessageAt: thread.lastMessageAt,
    createdAt: thread.createdAt,
  }));
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string, userId: string) {
  const dbThread = await prisma.taxAssistantThread.findUnique({
    where: { id: threadId },
  });

  if (!dbThread) {
    throw new Error('Thread not found');
  }

  // Verify ownership
  if (dbThread.userId !== userId) {
    throw new Error('Unauthorized access to thread');
  }

  // Soft delete
  await prisma.taxAssistantThread.update({
    where: { id: threadId },
    data: { isActive: false },
  });

  return { success: true };
}

/**
 * Extract IRS form references from text
 */
function extractFormReferences(text: string): string[] {
  const formPatterns = [
    /Form\s+(\d{4}[A-Z]*)/gi,
    /Schedule\s+([A-Z])/gi,
    /Form\s+W-(\d)/gi,
    /Form\s+(\d{4}-[A-Z]+)/gi,
  ];

  const references = new Set<string>();

  formPatterns.forEach((pattern) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      references.add(match[0].replace(/Form\s+/i, '').replace(/Schedule\s+/i, 'Schedule '));
    }
  });

  return Array.from(references);
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(userId: string) {
  const stats = await prisma.taxAssistantThread.aggregate({
    where: { userId },
    _sum: {
      tokensUsed: true,
      costInCents: true,
      messageCount: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    totalThreads: stats._count.id || 0,
    totalMessages: stats._sum.messageCount || 0,
    totalTokens: stats._sum.tokensUsed || 0,
    totalCostCents: stats._sum.costInCents || 0,
  };
}
