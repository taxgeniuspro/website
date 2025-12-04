'use client';

/**
 * Tax Assistant Widget
 *
 * Floating chat widget for tax form assistance
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  formReferences: string[];
  createdAt: Date;
}

interface Thread {
  id: string;
  title: string;
  lastMessage: string | null;
  messageCount: number;
  lastMessageAt: Date;
}

interface TaxAssistantWidgetProps {
  defaultOpen?: boolean;
}

export function TaxAssistantWidget({ defaultOpen = false }: TaxAssistantWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [showThreadList, setShowThreadList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for open event from mobile hub
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openTaxAssistant', handleOpen);
    return () => window.removeEventListener('openTaxAssistant', handleOpen);
  }, []);

  // Load threads when widget opens
  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadThreads = async () => {
    try {
      const response = await fetch('/api/tax-assistant/threads');
      const data = await response.json();
      if (data.success) {
        setThreads(data.data);
      }
    } catch (error) {
      logger.error('Error loading threads:', error);
    }
  };

  const createNewThread = async (initialMessage?: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tax-assistant/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessage }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentThreadId(data.data.threadId);
        setMessages(data.data.messages);
        setShowThreadList(false);
        await loadThreads();
      }
    } catch (error) {
      logger.error('Error creating thread:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tax-assistant/threads/${threadId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentThreadId(threadId);
        setMessages(data.data.messages);
        setShowThreadList(false);
      }
    } catch (error) {
      logger.error('Error loading thread:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    // If no thread exists, create one with this message
    if (!currentThreadId) {
      await createNewThread(messageText);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/tax-assistant/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          message: messageText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      logger.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Window - No floating button, opened via menu */}
      {isOpen && (
        <Card
          className={`fixed shadow-2xl z-[9999] flex flex-col ${
            isMobile ? 'inset-0 w-full h-full rounded-none' : 'bottom-6 right-6 w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Tax Form Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowThreadList(!showThreadList)}
                className="h-8 w-8 hover:bg-primary/80"
                title="View conversations"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 hover:bg-primary/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Thread List View */}
          {showThreadList ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b">
                <Button onClick={() => createNewThread()} className="w-full" disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => loadThread(thread.id)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm truncate">{thread.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {thread.lastMessage || 'No messages yet'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {thread.messageCount} messages
                      </div>
                    </button>
                  ))}
                  {threads.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No conversations yet. Start a new one!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-medium mb-2">Welcome to Tax Form Assistant!</p>
                    <p className="text-xs">
                      Ask me anything about IRS forms, where to enter deductions, credits, or
                      income.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        {message.formReferences.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.formReferences.map((form, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {form}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about tax forms..."
                    className="min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Powered by OpenAI • Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
