import { Resend } from 'resend';

// Lazy-initialize Resend to avoid build-time errors when API key is not set
let resendClient: Resend | null = null;

/**
 * Get the Resend client instance (lazy-loaded)
 * This prevents build-time errors when RESEND_API_KEY is not available
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Re-export Resend type for convenience
export { Resend };
