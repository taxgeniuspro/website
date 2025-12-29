/**
 * Tax Assistant Service - OpenAI Integration
 *
 * Provides tax form assistance to tax preparers using OpenAI's Assistants API
 * with file search capabilities for IRS form knowledge base.
 */

import OpenAI from 'openai';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface TaxAssistantThreadRecord {
  id: string;
  userId: string;
  openaiThreadId: string;
  openaiAssistantId: string;
  title?: string | null;
  lastMessage?: string | null;
  messageCount: number;
  lastMessageAt?: Date | string | null;
  tokensUsed: number;
  costInCents: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  messages?: TaxAssistantMessageRecord[];
}

interface TaxAssistantMessageRecord {
  id: string;
  threadId: string;
  openaiMessageId: string;
  role: string;
  content: string;
  formReferences: string[];
  tokensUsed: number;
  createdAt: Date | string;
}

// Lazy-initialize OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

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
    const thread = await getOpenAIClient().beta.threads.create();

    // Store thread in database
    const { data: dbThreadData, error } = await db
      .from('tax_assistant_threads')
      .insert({
        userId,
        openaiThreadId: thread.id,
        openaiAssistantId: ASSISTANT_ID,
        title: initialMessage ? initialMessage.substring(0, 100) : 'New Conversation',
        messageCount: 0,
        tokensUsed: 0,
        costInCents: 0,
        isActive: true,
      })
      .select()
      .single();

    if (error || !dbThreadData) {
      throw new Error(`Failed to create thread: ${error?.message}`);
    }

    const dbThread = dbThreadData as TaxAssistantThreadRecord;

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
    const { data: threadData } = await db
      .from('tax_assistant_threads')
      .select('*')
      .eq('id', threadId)
      .limit(1);

    const dbThread = firstOrNull(threadData) as TaxAssistantThreadRecord | null;

    if (!dbThread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (dbThread.userId !== userId) {
      throw new Error('Unauthorized access to thread');
    }

    // Add message to OpenAI thread
    await getOpenAIClient().beta.threads.messages.create(dbThread.openaiThreadId, {
      role: 'user',
      content: message,
    });

    // Run the assistant
    const run = await getOpenAIClient().beta.threads.runs.create(dbThread.openaiThreadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Wait for completion
    let runStatus = await getOpenAIClient().beta.threads.runs.retrieve(dbThread.openaiThreadId, run.id);

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
      runStatus = await getOpenAIClient().beta.threads.runs.retrieve(dbThread.openaiThreadId, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant response timeout');
    }

    // Get messages from OpenAI
    const messagesResponse = await getOpenAIClient().beta.threads.messages.list(dbThread.openaiThreadId);

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

      const { data: savedData, error: saveError } = await db
        .from('tax_assistant_messages')
        .insert({
          threadId: dbThread.id,
          openaiMessageId: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: contentText,
          formReferences,
          tokensUsed: 0, // OpenAI doesn't provide per-message tokens
        })
        .select()
        .single();

      if (saveError || !savedData) {
        throw new Error(`Failed to save message: ${saveError?.message}`);
      }

      const saved = savedData as TaxAssistantMessageRecord;

      savedMessages.push({
        id: saved.id,
        role: saved.role as 'user' | 'assistant',
        content: saved.content,
        formReferences: saved.formReferences,
        createdAt: new Date(saved.createdAt),
      });
    }

    // Update thread metadata
    await db
      .from('tax_assistant_threads')
      .update({
        lastMessage: message.substring(0, 500),
        messageCount: dbThread.messageCount + 2, // User + assistant
        lastMessageAt: new Date().toISOString(),
        tokensUsed: dbThread.tokensUsed + (runStatus.usage?.total_tokens || 0),
      })
      .eq('id', dbThread.id);

    // Get all messages for response
    const { data: allMessagesData } = await db
      .from('tax_assistant_messages')
      .select('*')
      .eq('threadId', dbThread.id)
      .order('createdAt', { ascending: true });

    const allMessages = (allMessagesData || []) as TaxAssistantMessageRecord[];

    return {
      threadId: dbThread.id,
      openaiThreadId: dbThread.openaiThreadId,
      messages: allMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        formReferences: msg.formReferences,
        createdAt: new Date(msg.createdAt),
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
  const { data: threadData } = await db
    .from('tax_assistant_threads')
    .select('*')
    .eq('id', threadId)
    .limit(1);

  const dbThread = firstOrNull(threadData) as TaxAssistantThreadRecord | null;

  if (!dbThread) {
    throw new Error('Thread not found');
  }

  // Verify ownership
  if (dbThread.userId !== userId) {
    throw new Error('Unauthorized access to thread');
  }

  // Get messages
  const { data: messagesData } = await db
    .from('tax_assistant_messages')
    .select('*')
    .eq('threadId', threadId)
    .order('createdAt', { ascending: true });

  const messages = (messagesData || []) as TaxAssistantMessageRecord[];

  return {
    threadId: dbThread.id,
    openaiThreadId: dbThread.openaiThreadId,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      formReferences: msg.formReferences,
      createdAt: new Date(msg.createdAt),
    })),
  };
}

/**
 * List all threads for a user
 */
export async function listThreads(userId: string) {
  const { data: threadsData } = await db
    .from('tax_assistant_threads')
    .select('*')
    .eq('userId', userId)
    .eq('isActive', true)
    .order('lastMessageAt', { ascending: false })
    .limit(50);

  const threads = (threadsData || []) as TaxAssistantThreadRecord[];

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title || 'Untitled Conversation',
    lastMessage: thread.lastMessage,
    messageCount: thread.messageCount,
    lastMessageAt: thread.lastMessageAt ? new Date(thread.lastMessageAt) : null,
    createdAt: new Date(thread.createdAt),
  }));
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string, userId: string) {
  const { data: threadData } = await db
    .from('tax_assistant_threads')
    .select('id, userId')
    .eq('id', threadId)
    .limit(1);

  const dbThread = firstOrNull(threadData) as { id: string; userId: string } | null;

  if (!dbThread) {
    throw new Error('Thread not found');
  }

  // Verify ownership
  if (dbThread.userId !== userId) {
    throw new Error('Unauthorized access to thread');
  }

  // Soft delete
  await db
    .from('tax_assistant_threads')
    .update({ isActive: false })
    .eq('id', threadId);

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
  const { data: threadsData } = await db
    .from('tax_assistant_threads')
    .select('id, tokensUsed, costInCents, messageCount')
    .eq('userId', userId);

  const threads = (threadsData || []) as Array<{
    id: string;
    tokensUsed: number;
    costInCents: number;
    messageCount: number;
  }>;

  // Calculate aggregates in JS
  const totalThreads = threads.length;
  const totalMessages = threads.reduce((sum, t) => sum + (t.messageCount || 0), 0);
  const totalTokens = threads.reduce((sum, t) => sum + (t.tokensUsed || 0), 0);
  const totalCostCents = threads.reduce((sum, t) => sum + (t.costInCents || 0), 0);

  return {
    totalThreads,
    totalMessages,
    totalTokens,
    totalCostCents,
  };
}
