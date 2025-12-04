/**
 * Onboarding System
 *
 * Tracks and manages first-time user onboarding experience.
 * Stores completion state in localStorage.
 */

import { UserRole } from '@/lib/permissions';

const ONBOARDING_STORAGE_KEY = 'onboarding_completed';
const ONBOARDING_STEP_KEY = 'onboarding_current_step';

export interface OnboardingStep {
  /**
   * Unique step identifier
   */
  id: string;

  /**
   * Step title
   */
  title: string;

  /**
   * Step description
   */
  description: string;

  /**
   * Icon name from lucide-react
   */
  icon: string;

  /**
   * Optional action button
   */
  action?: {
    label: string;
    href: string;
  };

  /**
   * Optional image/illustration
   */
  image?: string;
}

/**
 * Onboarding steps for each role
 */
export const ONBOARDING_STEPS: Record<UserRole, OnboardingStep[]> = {
  super_admin: [
    {
      id: 'welcome',
      title: 'Welcome, Super Admin!',
      description: 'You have full access to all system features. Manage users, view analytics, and configure system settings.',
      icon: 'Shield',
    },
    {
      id: 'role-switching',
      title: 'Role Switching',
      description: 'Use the "Switch View" button in the header to preview the application from other roles\' perspectives.',
      icon: 'Eye',
    },
    {
      id: 'analytics',
      title: 'System Analytics',
      description: 'Access comprehensive analytics for tax preparers, affiliates, clients, and system-wide metrics.',
      icon: 'BarChart3',
      action: {
        label: 'View Analytics',
        href: '/admin/analytics',
      },
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage all users, assign roles, and handle permissions from the Users page.',
      icon: 'Users',
      action: {
        label: 'Manage Users',
        href: '/admin/users',
      },
    },
  ],
  admin: [
    {
      id: 'welcome',
      title: 'Welcome, Admin!',
      description: 'Manage operations, view analytics, and support tax preparers and clients.',
      icon: 'Shield',
    },
    {
      id: 'dashboard',
      title: 'Admin Dashboard',
      description: 'Your dashboard provides an overview of client status, referrals, emails, and key metrics.',
      icon: 'LayoutDashboard',
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'Track performance metrics for tax preparers, affiliates, and clients.',
      icon: 'BarChart3',
      action: {
        label: 'View Analytics',
        href: '/admin/analytics',
      },
    },
    {
      id: 'support',
      title: 'User Support',
      description: 'Manage support tickets, respond to inquiries, and help users succeed.',
      icon: 'MessageSquare',
    },
  ],
  tax_preparer: [
    {
      id: 'welcome',
      title: 'Welcome, Tax Preparer!',
      description: 'Get started with managing clients, tracking leads, and growing your tax preparation business.',
      icon: 'Sparkles',
    },
    {
      id: 'clients',
      title: 'Manage Your Clients',
      description: 'View assigned clients, track their tax filing status, and manage documents all in one place.',
      icon: 'Users',
      action: {
        label: 'View Clients',
        href: '/dashboard/tax-preparer/overview',
      },
    },
    {
      id: 'leads',
      title: 'Convert Leads',
      description: 'Follow up with new leads, contact them, and convert them to clients.',
      icon: 'UserPlus',
      action: {
        label: 'View Leads',
        href: '/dashboard/tax-preparer/leads',
      },
    },
    {
      id: 'tracking',
      title: 'Your Referral Link',
      description: 'Share your unique tracking link to earn commissions. Track clicks and conversions.',
      icon: 'Link',
      action: {
        label: 'Get Tracking Link',
        href: '/dashboard/tax-preparer/tracking',
      },
    },
    {
      id: 'earnings',
      title: 'Track Earnings',
      description: 'Monitor your commissions, request payouts, and view detailed earnings reports.',
      icon: 'DollarSign',
      action: {
        label: 'View Earnings',
        href: '/dashboard/tax-preparer/earnings',
      },
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Speed up your workflow! Press ? to view all keyboard shortcuts, or ⌘K to search.',
      icon: 'Keyboard',
    },
  ],
  affiliate: [
    {
      id: 'welcome',
      title: 'Welcome, Affiliate!',
      description: 'Start earning commissions by referring clients to Tax Genius Pro.',
      icon: 'Sparkles',
    },
    {
      id: 'tracking',
      title: 'Your Referral Link',
      description: 'Share your unique tracking link with your network to earn commissions on every conversion.',
      icon: 'Link',
      action: {
        label: 'Get Tracking Link',
        href: '/dashboard/affiliate/tracking',
      },
    },
    {
      id: 'marketing',
      title: 'Marketing Materials',
      description: 'Access professional marketing materials to promote Tax Genius Pro effectively.',
      icon: 'Image',
      action: {
        label: 'View Materials',
        href: '/dashboard/affiliate/marketing',
      },
    },
    {
      id: 'analytics',
      title: 'Track Performance',
      description: 'Monitor clicks, conversions, and earnings in real-time from your analytics dashboard.',
      icon: 'BarChart3',
      action: {
        label: 'View Analytics',
        href: '/dashboard/affiliate/analytics',
      },
    },
    {
      id: 'earnings',
      title: 'Get Paid',
      description: 'Request payouts once you reach the minimum threshold. View payment history anytime.',
      icon: 'DollarSign',
      action: {
        label: 'View Earnings',
        href: '/dashboard/affiliate/earnings',
      },
    },
  ],
  referrer: [
    {
      id: 'welcome',
      title: 'Welcome, Referrer!',
      description: 'Earn rewards by referring clients to Tax Genius Pro.',
      icon: 'Gift',
    },
    {
      id: 'tracking',
      title: 'Your Referral Link',
      description: 'Share your unique link with friends and family to earn referral bonuses.',
      icon: 'Link',
      action: {
        label: 'Get Referral Link',
        href: '/dashboard/referrer/tracking',
      },
    },
    {
      id: 'contest',
      title: 'Referral Contest',
      description: 'Participate in our referral contests to win additional prizes and bonuses.',
      icon: 'Trophy',
      action: {
        label: 'View Contest',
        href: '/dashboard/referrer/contest',
      },
    },
    {
      id: 'analytics',
      title: 'Track Referrals',
      description: 'See how many people you\'ve referred and track your earnings.',
      icon: 'BarChart3',
      action: {
        label: 'View Analytics',
        href: '/dashboard/referrer/analytics',
      },
    },
  ],
  client: [
    {
      id: 'welcome',
      title: 'Welcome to Tax Genius Pro!',
      description: 'We\'re here to make tax filing simple and stress-free. Let\'s get started!',
      icon: 'Sparkles',
    },
    {
      id: 'preparer',
      title: 'Your Tax Preparer',
      description: 'A dedicated tax professional has been assigned to handle your tax return.',
      icon: 'UserCheck',
    },
    {
      id: 'documents',
      title: 'Upload Documents',
      description: 'Securely upload your tax documents (W-2s, 1099s, etc.) to get started.',
      icon: 'Upload',
      action: {
        label: 'Upload Documents',
        href: '/dashboard/client/documents',
      },
    },
    {
      id: 'messages',
      title: 'Stay Connected',
      description: 'Message your tax preparer anytime if you have questions or need assistance.',
      icon: 'MessageSquare',
      action: {
        label: 'View Messages',
        href: '/dashboard/client/messages',
      },
    },
    {
      id: 'status',
      title: 'Track Your Return',
      description: 'Monitor your tax return status from submission to filing to acceptance.',
      icon: 'FileCheck',
    },
  ],
  lead: [
    {
      id: 'welcome',
      title: 'Welcome!',
      description: 'Thank you for your interest in Tax Genius Pro. A tax preparer will contact you soon.',
      icon: 'Sparkles',
    },
    {
      id: 'contact',
      title: 'We\'ll Be In Touch',
      description: 'One of our professional tax preparers will reach out to discuss your tax needs.',
      icon: 'Phone',
    },
    {
      id: 'services',
      title: 'Our Services',
      description: 'We offer personal tax filing, business taxes, tax planning, and more.',
      icon: 'FileText',
    },
  ],
};

/**
 * Check if user has completed onboarding
 *
 * NOTE: Tours are currently disabled for all users.
 * This function always returns true to skip onboarding tours.
 */
export function hasCompletedOnboarding(role?: UserRole): boolean {
  // Tours disabled - always return true to skip onboarding
  return true;

  /* Original implementation (disabled):
  if (typeof window === 'undefined') return true;

  try {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) return false;

    const completedData = JSON.parse(completed);
    return role ? completedData[role] === true : false;
  } catch (error) {
    console.error('Error checking onboarding completion:', error);
    return false;
  }
  */
}

/**
 * Mark onboarding as completed for a role
 */
export function markOnboardingComplete(role: UserRole): void {
  if (typeof window === 'undefined') return;

  try {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const completedData = completed ? JSON.parse(completed) : {};
    completedData[role] = true;
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedData));
    localStorage.removeItem(ONBOARDING_STEP_KEY);
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
  }
}

/**
 * Reset onboarding for a role (for testing)
 */
export function resetOnboarding(role?: UserRole): void {
  if (typeof window === 'undefined') return;

  try {
    if (role) {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const completedData = completed ? JSON.parse(completed) : {};
      delete completedData[role];
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedData));
    } else {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
    localStorage.removeItem(ONBOARDING_STEP_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

/**
 * Get current onboarding step
 */
export function getCurrentStep(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const step = localStorage.getItem(ONBOARDING_STEP_KEY);
    return step ? parseInt(step, 10) : 0;
  } catch (error) {
    console.error('Error getting current step:', error);
    return 0;
  }
}

/**
 * Set current onboarding step
 */
export function setCurrentStep(step: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ONBOARDING_STEP_KEY, step.toString());
  } catch (error) {
    console.error('Error setting current step:', error);
  }
}

/**
 * Get onboarding steps for a role
 */
export function getOnboardingSteps(role: UserRole): OnboardingStep[] {
  return ONBOARDING_STEPS[role] || [];
}
