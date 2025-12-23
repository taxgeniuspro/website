import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

// Reserved routes that should not be treated as usernames
const RESERVED_ROUTES = [
  'api',
  'auth',
  'dashboard',
  'apply',
  'refer',
  'landing',
  'cash-advance',
  'start-filing',
  'admin',
  'about',
  'terms',
  'privacy',
  'contact',
  'help',
  'blog',
  'careers',
  'press',
  'partners',
  'legal',
  'security',
  'status',
  'pricing',
  'features',
  'enterprise',
  'developers',
  'docs',
  'support',
  'signin',
  'signup',
  'login',
  'register',
  'logout',
  'settings',
  'profile',
  'account',
  'billing',
  'notifications',
  'preferences',
  'download',
  'mobile',
  'desktop',
  'app',
  'public',
  'static',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
];

// Mapping for reserved routes that should redirect elsewhere
const REDIRECT_MAP: Record<string, string> = {
  signin: '/auth/signin',
  signup: '/auth/register',
  login: '/auth/signin',
  register: '/auth/register',
  logout: '/api/auth/signout',
};

export default async function VanityUrlPage({ params }: PageProps) {
  const { username } = await params;
  const lowerUsername = username.toLowerCase();

  // Check if this should redirect to a specific page
  if (REDIRECT_MAP[lowerUsername]) {
    redirect(REDIRECT_MAP[lowerUsername]);
  }

  // Check if this is a reserved route
  if (RESERVED_ROUTES.includes(lowerUsername)) {
    redirect('/404');
  }

  // In production, validate username exists in database
  // For now, treat all non-reserved usernames as valid referral codes

  // Convert username to referral code format
  // In production, look up the actual referral code from the database
  const referralCode = username.toUpperCase();

  // Redirect to referral page with the code
  redirect(`/refer?code=${referralCode}`);
}
