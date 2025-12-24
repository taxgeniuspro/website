import { redirect } from 'next/navigation';

/**
 * Sign Up Page - Redirects to Clerk Account Portal
 *
 * Uses Clerk's hosted Account Portal for registration at accounts.taxgeniuspro.tax
 * This provides a seamless, secure sign-up experience managed by Clerk.
 */
export default function SignUpPage() {
  redirect('https://accounts.taxgeniuspro.tax/sign-up');
}
