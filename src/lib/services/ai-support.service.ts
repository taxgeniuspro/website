/**
 * AI Support Service
 * OpenAI-powered features for support tickets:
 * - Suggest responses based on ticket history
 * - Analyze ticket sentiment
 * - Summarize ticket conversations
 * - Categorize tickets automatically
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

// Local type definitions (replacing @prisma/client)
interface SystemSettingRecord {
  id: string;
  key: string;
  value: string;
}

interface ProfileSummary {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
}

interface TicketMessageRecord {
  id: string;
  ticketId: string;
  senderId?: string | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
  senderProfile?: ProfileSummary | null;
}

interface SupportTicketRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  creatorId: string;
  assignedToId?: string | null;
  createdAt: string;
}

// ==================== Types ====================

export interface SuggestResponseInput {
  ticketId: string;
  context?: string;
}

export interface AnalyzeSentimentInput {
  ticketId: string;
}

export interface SummarizeTicketInput {
  ticketId: string;
}

export interface CategorizeTicketInput {
  title: string;
  description: string;
}

// ==================== AI Client ====================

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client with API key from settings
 */
async function getOpenAIClient(): Promise<OpenAI | null> {
  if (openaiClient) {
    return openaiClient;
  }

  try {
    // Get OpenAI API key from system settings
    const { data: settingData } = await db
      .from('system_settings')
      .select('key, value')
      .eq('key', 'openai_api_key')
      .limit(1);

    const setting = firstOrNull(settingData) as SystemSettingRecord | null;

    if (!setting || !setting.value) {
      logger.warn('OpenAI API key not configured');
      return null;
    }

    const apiKey = JSON.parse(setting.value);

    openaiClient = new OpenAI({
      apiKey: apiKey,
    });

    return openaiClient;
  } catch (error) {
    logger.error('Failed to initialize OpenAI client', { error });
    return null;
  }
}

/**
 * Check if AI features are enabled
 */
async function isAIEnabled(): Promise<boolean> {
  try {
    const { data: settingData } = await db
      .from('system_settings')
      .select('key, value')
      .eq('key', 'support_ai_enabled')
      .limit(1);

    const setting = firstOrNull(settingData) as SystemSettingRecord | null;

    return setting ? JSON.parse(setting.value) === true : false;
  } catch (error) {
    return false;
  }
}

// ==================== AI Features ====================

/**
 * Suggest a response for a tax preparer based on ticket history
 */
export async function suggestResponse(input: SuggestResponseInput) {
  try {
    const enabled = await isAIEnabled();
    if (!enabled) {
      throw new Error('AI features are not enabled');
    }

    const client = await getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client not configured');
    }

    // Get ticket details
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', input.ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as SupportTicketRecord | null;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get creator profile
    const { data: creatorData } = await db
      .from('profiles')
      .select('firstName, lastName')
      .eq('id', ticket.creatorId)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileSummary | null;

    // Get assignedTo profile if exists
    let assignedTo: ProfileSummary | null = null;
    if (ticket.assignedToId) {
      const { data: assignedData } = await db
        .from('profiles')
        .select('firstName, lastName')
        .eq('id', ticket.assignedToId)
        .limit(1);
      assignedTo = firstOrNull(assignedData) as ProfileSummary | null;
    }

    // Get messages with sender profiles (only public messages)
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('id, ticketId, senderId, content, isInternal, createdAt')
      .eq('ticketId', input.ticketId)
      .eq('isInternal', false)
      .order('createdAt', { ascending: true });

    const messages: TicketMessageRecord[] = [];
    for (const msg of (messagesData || [])) {
      let senderProfile: ProfileSummary | null = null;
      if (msg.senderId) {
        const { data: senderData } = await db
          .from('profiles')
          .select('firstName, lastName, role')
          .eq('id', msg.senderId)
          .limit(1);
        senderProfile = firstOrNull(senderData) as ProfileSummary | null;
      }
      messages.push({
        ...msg,
        senderProfile,
      });
    }

    // Build conversation context
    const conversationContext = messages
      .map((msg) => {
        const senderName = msg.senderProfile
          ? `${msg.senderProfile.firstName} ${msg.senderProfile.lastName}`
          : 'Unknown';
        const role = msg.senderProfile?.role === 'client' ? 'Client' : 'Tax Preparer';
        return `${role} (${senderName}): ${msg.content}`;
      })
      .join('\n\n');

    // Build system prompt
    const systemPrompt = `You are a professional tax preparation assistant helping tax preparers respond to client questions.
Your role is to suggest professional, accurate, and helpful responses.

Context:
- Client Name: ${creator?.firstName || 'Unknown'} ${creator?.lastName || ''}
- Ticket Title: ${ticket.title}
- Ticket Description: ${ticket.description}
- Priority: ${ticket.priority}
- Status: ${ticket.status}

Conversation History:
${conversationContext}

${input.context ? `\nAdditional Context: ${input.context}` : ''}

Provide a professional response suggestion that:
1. Addresses the client's most recent question or concern
2. Uses clear, professional language appropriate for tax matters
3. Is helpful and actionable
4. Maintains client trust and confidence
5. Is approximately 2-4 paragraphs long`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: 'Please suggest a response to the latest message in this ticket.',
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const suggestedResponse = completion.choices[0]?.message?.content || '';

    logger.info('AI response suggested', {
      ticketId: input.ticketId,
      responseLength: suggestedResponse.length,
    });

    return {
      suggestedResponse,
      model: 'gpt-4o-mini',
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('Failed to suggest AI response', {
      error,
      ticketId: input.ticketId,
    });
    throw new Error('Failed to generate AI response suggestion');
  }
}

/**
 * Analyze the sentiment of a ticket conversation
 * Returns: positive, neutral, negative, or urgent
 */
export async function analyzeSentiment(input: AnalyzeSentimentInput) {
  try {
    const enabled = await isAIEnabled();
    if (!enabled) {
      throw new Error('AI features are not enabled');
    }

    const client = await getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client not configured');
    }

    // Get ticket details
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', input.ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as SupportTicketRecord | null;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get messages with sender profiles (only public messages)
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('id, senderId, content, isInternal, createdAt')
      .eq('ticketId', input.ticketId)
      .eq('isInternal', false)
      .order('createdAt', { ascending: true });

    // Get sender profiles and filter for client messages
    const clientMessageContents: string[] = [];
    for (const msg of (messagesData || [])) {
      if (msg.senderId) {
        const { data: senderData } = await db
          .from('profiles')
          .select('role')
          .eq('id', msg.senderId)
          .limit(1);
        const sender = firstOrNull(senderData) as ProfileSummary | null;
        if (sender?.role === 'client') {
          clientMessageContents.push(msg.content);
        }
      }
    }

    // Focus on client messages for sentiment
    const clientMessages = clientMessageContents.join('\n\n');

    const systemPrompt = `You are a sentiment analysis assistant for a tax preparation support system.
Analyze the client's sentiment based on their messages and classify it as one of:
- positive: Client is satisfied, happy, or grateful
- neutral: Client is calm, matter-of-fact, or simply asking questions
- negative: Client is frustrated, unhappy, or dissatisfied
- urgent: Client indicates urgency, deadline pressure, or critical issues

Respond with ONLY the sentiment category (positive, neutral, negative, or urgent) and a brief reason (1 sentence).

Client Messages:
${clientMessages}

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: 'What is the overall sentiment?',
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content || '';
    const sentiment = response.toLowerCase().includes('positive')
      ? 'positive'
      : response.toLowerCase().includes('negative')
        ? 'negative'
        : response.toLowerCase().includes('urgent')
          ? 'urgent'
          : 'neutral';

    logger.info('Sentiment analyzed', {
      ticketId: input.ticketId,
      sentiment,
    });

    return {
      sentiment,
      explanation: response,
      model: 'gpt-4o-mini',
    };
  } catch (error) {
    logger.error('Failed to analyze sentiment', {
      error,
      ticketId: input.ticketId,
    });
    throw new Error('Failed to analyze sentiment');
  }
}

/**
 * Summarize a ticket conversation for quick review
 */
export async function summarizeTicket(input: SummarizeTicketInput) {
  try {
    const enabled = await isAIEnabled();
    if (!enabled) {
      throw new Error('AI features are not enabled');
    }

    const client = await getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client not configured');
    }

    // Get ticket details
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', input.ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as SupportTicketRecord | null;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get messages with sender profiles (only public messages)
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('id, senderId, content, isInternal, createdAt')
      .eq('ticketId', input.ticketId)
      .eq('isInternal', false)
      .order('createdAt', { ascending: true });

    // Build conversation with sender roles
    const conversationParts: string[] = [];
    for (const msg of (messagesData || [])) {
      let role = 'Preparer';
      if (msg.senderId) {
        const { data: senderData } = await db
          .from('profiles')
          .select('role')
          .eq('id', msg.senderId)
          .limit(1);
        const sender = firstOrNull(senderData) as ProfileSummary | null;
        if (sender?.role === 'client') {
          role = 'Client';
        }
      }
      conversationParts.push(`${role}: ${msg.content}`);
    }

    // Build conversation context
    const conversation = conversationParts.join('\n\n');

    const systemPrompt = `You are a summarization assistant for a tax preparation support system.
Provide a concise summary of this support ticket in bullet points.

Format your response as:
- **Issue:** [1 sentence describing the main issue]
- **Client Concern:** [Key concern or question from the client]
- **Action Taken:** [What the preparer did or recommended]
- **Status:** [Current status or next steps]

Keep each bullet point to 1 sentence maximum.

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}

Conversation:
${conversation}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: 'Please summarize this ticket.',
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content || '';

    logger.info('Ticket summarized', {
      ticketId: input.ticketId,
      summaryLength: summary.length,
    });

    return {
      summary,
      model: 'gpt-4o-mini',
    };
  } catch (error) {
    logger.error('Failed to summarize ticket', {
      error,
      ticketId: input.ticketId,
    });
    throw new Error('Failed to summarize ticket');
  }
}

/**
 * Automatically categorize a ticket based on title and description
 * Returns suggested tags
 */
export async function categorizeTicket(input: CategorizeTicketInput) {
  try {
    const enabled = await isAIEnabled();
    if (!enabled) {
      throw new Error('AI features are not enabled');
    }

    const client = await getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client not configured');
    }

    const systemPrompt = `You are a ticket categorization assistant for a tax preparation support system.
Analyze the ticket and suggest 1-3 relevant tags from these categories:

Tax-Related Tags:
- tax-deduction
- filing-status
- tax-credit
- deadline-extension
- refund-inquiry
- audit-support
- estimated-taxes
- business-expenses
- tax-forms
- tax-planning

Process Tags:
- document-request
- missing-information
- status-update
- general-question
- technical-issue
- schedule-consultation

Priority Tags:
- urgent
- deadline-sensitive
- routine

Respond with ONLY a comma-separated list of 1-3 tags (e.g., "tax-deduction, document-request, routine")

Ticket Title: ${input.title}
Ticket Description: ${input.description}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: 'Suggest appropriate tags for this ticket.',
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content || '';
    const tags = response
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    logger.info('Ticket categorized', {
      title: input.title,
      suggestedTags: tags,
    });

    return {
      suggestedTags: tags,
      model: 'gpt-4o-mini',
    };
  } catch (error) {
    logger.error('Failed to categorize ticket', {
      error,
      input,
    });
    throw new Error('Failed to categorize ticket');
  }
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(startDate?: Date, endDate?: Date) {
  try {
    // This is a placeholder for tracking AI usage
    // You might want to create a separate table to track AI API calls

    return {
      totalRequests: 0,
      responseSuggestions: 0,
      sentimentAnalyses: 0,
      summarizations: 0,
      categorizations: 0,
      estimatedCost: 0, // Calculate based on tokens used
    };
  } catch (error) {
    logger.error('Failed to get AI usage stats', { error });
    return {
      totalRequests: 0,
      responseSuggestions: 0,
      sentimentAnalyses: 0,
      summarizations: 0,
      categorizations: 0,
      estimatedCost: 0,
    };
  }
}
