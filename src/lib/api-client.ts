import { logger } from '@/lib/logger';
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface APIClientConfig {
  baseURL?: string;
  defaultHeaders?: HeadersInit;
  retry?: Partial<RetryConfig>;
  timeout?: number;
}

export class APIError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'APIError';
  }
}

export class APIClient {
  private config: Required<APIClientConfig>;
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      defaultHeaders: config.defaultHeaders || {},
      retry: { ...this.defaultRetryConfig, ...config.retry },
      timeout: config.timeout || 30000,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number): number {
    const delay =
      this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.retry.maxDelay);
  }

  private shouldRetry(error: APIError, attempt: number): boolean {
    if (attempt >= this.config.retry.maxAttempts) return false;

    // Retry on server errors (500-599), network errors, and timeout
    return (
      error.statusCode >= 500 ||
      error.statusCode === 0 ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch')
    );
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseURL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      if (!response.ok) {
        let errorData: any = { message: response.statusText };

        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          }
        } catch {
          // If we can't parse the error response, use the status text
        }

        const apiError = new APIError(
          errorData.error?.message || errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.error?.code || 'HTTP_ERROR',
          errorData.error?.details
        );

        if (this.shouldRetry(apiError, attempt)) {
          const delay = this.calculateDelay(attempt);
          logger.warn(
            `API request failed (attempt ${attempt}), retrying in ${delay}ms:`,
            apiError.message
          );
          await this.sleep(delay);
          return this.makeRequest<T>(url, options, attempt + 1);
        }

        throw apiError;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return null as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      // Handle fetch errors (network issues, timeouts, etc.)
      const networkError = new APIError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        'NETWORK_ERROR'
      );

      if (this.shouldRetry(networkError, attempt)) {
        const delay = this.calculateDelay(attempt);
        logger.warn(
          `Network error (attempt ${attempt}), retrying in ${delay}ms:`,
          networkError.message
        );
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      throw networkError;
    }
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' });
  }
}

// Create default client instance
export const apiClient = new APIClient({
  baseURL: '/api',
  defaultHeaders: {
    Accept: 'application/json',
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
  },
  timeout: 15000,
});

// Helper functions for common API operations
export async function fetchWithRetry<T>(url: string, options?: RequestInit): Promise<T> {
  return apiClient.get<T>(url, options);
}

export async function postWithRetry<T>(
  url: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiClient.post<T>(url, data, options);
}

// Hook for React components to handle API errors gracefully
export function useAPIError() {
  const handleError = (error: unknown) => {
    if (error instanceof APIError) {
      // Handle specific error types
      switch (error.code) {
        case 'NETWORK_ERROR':
          return {
            title: 'Connection Error',
            message:
              'Unable to connect to the server. Please check your internet connection and try again.',
            canRetry: true,
          };
        case 'SERVICE_UNAVAILABLE':
          return {
            title: 'Service Temporarily Unavailable',
            message: 'The service is temporarily unavailable. Please try again in a few moments.',
            canRetry: true,
          };
        case 'UNAUTHORIZED':
          return {
            title: 'Authentication Required',
            message: 'Please log in to continue.',
            canRetry: false,
          };
        case 'FORBIDDEN':
          return {
            title: 'Access Denied',
            message: 'You do not have permission to access this resource.',
            canRetry: false,
          };
        default:
          return {
            title: 'Error',
            message: error.message || 'An unexpected error occurred.',
            canRetry: error.statusCode >= 500,
          };
      }
    }

    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      canRetry: true,
    };
  };

  return { handleError };
}
