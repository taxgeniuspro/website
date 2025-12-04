/**
 * LLM Error Handler
 * Graceful degradation for AI service failures
 */

export class LLMError extends Error {
  constructor(
    message: string,
    public service: 'ollama' | 'openai' | 'google',
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export async function withLLMFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  serviceName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`[${serviceName}] Operation failed, using fallback:`, error)
    return fallback
  }
}

export function handleLLMError(error: unknown, context: string): never {
  if (error instanceof LLMError) {
    throw error
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  throw new LLMError(`${context}: ${message}`, 'ollama', true)
}
