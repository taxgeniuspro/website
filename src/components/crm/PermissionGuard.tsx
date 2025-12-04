/**
 * CRM Permission Guard Component
 *
 * Conditionally renders content based on user's CRM permissions.
 * Shows locked state with upgrade prompt for disabled features.
 *
 * @module components/crm/PermissionGuard
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Shield, Zap, BarChart3, Mail, Workflow, ListTodo, TrendingUp } from 'lucide-react';
import { CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';

interface PermissionGuardProps {
  feature: CRMFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockedMessage?: boolean;
}

/**
 * Guard component that checks CRM permissions before rendering content
 *
 * @example
 * ```tsx
 * <CRMPermissionGuard feature={CRMFeature.EMAIL_AUTOMATION}>
 *   <EmailAutomationDashboard />
 * </CRMPermissionGuard>
 * ```
 */
export function CRMPermissionGuard({
  feature,
  children,
  fallback,
  showLockedMessage = true,
}: PermissionGuardProps) {
  const { data: session, status } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (status === 'loading' || !session?.user) {
        return;
      }

      try {
        const response = await fetch('/api/crm/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature }),
        });

        if (response.ok) {
          const data = await response.json();
          setHasPermission(data.allowed);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        logger.error('Error checking CRM permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [session, status, feature]);

  // Still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Has permission - render children
  if (hasPermission) {
    return <>{children}</>;
  }

  // No permission - render fallback or locked message
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockedMessage) {
    return <FeatureLockedMessage feature={feature} />;
  }

  return null;
}

/**
 * Feature locked message with upgrade prompt
 */
export function FeatureLockedMessage({ feature }: { feature: CRMFeature }) {
  const featureInfo = getFeatureInfo(feature);

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              {featureInfo.icon}
              {featureInfo.name}
            </CardTitle>
            <CardDescription>Feature not enabled for your account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{featureInfo.description}</p>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Contact Administrator</AlertTitle>
          <AlertDescription>
            This feature is available but needs to be enabled by your administrator. Contact your
            Tax Genius admin to request access.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium">With {featureInfo.name}, you can:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            {featureInfo.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <Zap className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button variant="outline" className="w-full" disabled>
          <Lock className="h-4 w-4 mr-2" />
          Feature Locked
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Get feature information for display
 */
function getFeatureInfo(feature: CRMFeature) {
  const featureMap = {
    [CRMFeature.EMAIL_AUTOMATION]: {
      name: 'Email Automation',
      icon: <Mail className="h-5 w-5" />,
      description:
        'Automate your email follow-ups with smart sequences and drip campaigns. Never miss a lead again.',
      benefits: [
        'Send automated welcome emails to new leads',
        'Schedule follow-up sequences with custom delays',
        'Track email opens and click-through rates',
        'Create reusable email templates',
        'Set up nurture campaigns that run automatically',
      ],
    },
    [CRMFeature.WORKFLOW_AUTOMATION]: {
      name: 'Workflow Automation',
      icon: <Workflow className="h-5 w-5" />,
      description:
        'Build powerful automation workflows that handle lead routing, task creation, and status updates automatically.',
      benefits: [
        'Automatically assign leads based on custom rules',
        'Create tasks when specific events occur',
        'Route leads to the right preparer based on expertise',
        'Send notifications when leads take action',
        'Build if/then logic for complex workflows',
      ],
    },
    [CRMFeature.ACTIVITY_TRACKING]: {
      name: 'Activity Timeline',
      icon: <ListTodo className="h-5 w-5" />,
      description:
        'View a complete timeline of all interactions with each lead. Never lose context on where you left off.',
      benefits: [
        'See every email, call, and note in chronological order',
        'Track lead engagement over time',
        'Log manual activities and notes',
        'Filter activities by type and date',
        'Export timeline for reporting',
      ],
    },
    [CRMFeature.ADVANCED_ANALYTICS]: {
      name: 'Advanced Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      description:
        'Get deep insights into lead quality, conversion rates, and performance metrics with advanced analytics.',
      benefits: [
        'View conversion funnels with drop-off points',
        'Track lead quality scores and trends',
        'Analyze performance by marketing source',
        'See time-to-conversion metrics',
        'Generate custom reports and exports',
      ],
    },
    [CRMFeature.TASK_MANAGEMENT]: {
      name: 'Task Management',
      icon: <ListTodo className="h-5 w-5" />,
      description:
        'Create, assign, and track tasks for each lead. Stay organized and never miss a follow-up.',
      benefits: [
        'Create tasks with due dates and priorities',
        'Get reminders for overdue tasks',
        'View all tasks in a unified dashboard',
        'Automatically create tasks from workflows',
        'Track task completion rates',
      ],
    },
    [CRMFeature.LEAD_SCORING]: {
      name: 'Lead Scoring',
      icon: <TrendingUp className="h-5 w-5" />,
      description:
        'Automatically score leads based on engagement, demographics, and behavior to prioritize your outreach.',
      benefits: [
        'See lead scores from 0-100',
        'Identify hot leads that need immediate attention',
        'Track score changes over time',
        'Get alerts when leads become hot',
        'Focus on high-quality leads first',
      ],
    },
    [CRMFeature.BULK_ACTIONS]: {
      name: 'Bulk Actions',
      icon: <Zap className="h-5 w-5" />,
      description:
        'Perform actions on multiple leads at once. Save time with bulk assign, tag, and export operations.',
      benefits: [
        'Assign multiple leads to preparers at once',
        'Add tags to groups of leads',
        'Export filtered lead lists to CSV',
        'Bulk update lead statuses',
        'Send batch emails to selected leads',
      ],
    },
  };

  return (
    featureMap[feature] || {
      name: 'CRM Feature',
      icon: <Lock className="h-5 w-5" />,
      description: 'This CRM feature requires admin permission to access.',
      benefits: ['Enhanced lead management', 'Improved efficiency', 'Better insights'],
    }
  );
}

/**
 * Inline permission check hook
 *
 * @example
 * ```tsx
 * const { hasPermission, loading } = useCRMPermission(CRMFeature.EMAIL_AUTOMATION);
 *
 * if (loading) return <Spinner />;
 * if (!hasPermission) return <LockedMessage />;
 *
 * return <EmailFeature />;
 * ```
 */
export function useCRMPermission(feature: CRMFeature) {
  const { data: session, status } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (status === 'loading' || !session?.user) {
        return;
      }

      try {
        const response = await fetch('/api/crm/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature }),
        });

        if (response.ok) {
          const data = await response.json();
          setHasPermission(data.allowed);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        logger.error('Error checking CRM permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [session, status, feature]);

  return { hasPermission, loading };
}
