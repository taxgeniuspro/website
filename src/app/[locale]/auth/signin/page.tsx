import { redirect } from 'next/navigation';

/**
 * Sign In Page - Redirects to Clerk Account Portal
 *
 * Uses Clerk's hosted Account Portal for authentication at accounts.taxgeniuspro.tax
 * This provides a seamless, secure sign-in experience managed by Clerk.
 */
export default function SignInPage() {
  redirect('https://accounts.taxgeniuspro.tax/sign-in');
}
