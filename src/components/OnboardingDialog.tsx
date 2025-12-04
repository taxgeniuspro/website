'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Eye,
  BarChart3,
  Users,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  UserPlus,
  Link as LinkIcon,
  DollarSign,
  Keyboard,
  Image,
  Gift,
  Trophy,
  UserCheck,
  Upload,
  FileCheck,
  Phone,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  getOnboardingSteps,
  getCurrentStep,
  setCurrentStep,
  type OnboardingStep,
} from '@/lib/onboarding';
import { UserRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface OnboardingDialogProps {
  /**
   * User's role
   */
  role: UserRole;

  /**
   * User's name for personalization
   */
  userName?: string;

  /**
   * Callback when onboarding is completed or skipped
   */
  onComplete?: () => void;
}

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Shield,
  Eye,
  BarChart3,
  Users,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  UserPlus,
  Link: LinkIcon,
  DollarSign,
  Keyboard,
  Image,
  Gift,
  Trophy,
  UserCheck,
  Upload,
  FileCheck,
  Phone,
  FileText,
};

/**
 * OnboardingDialog Component
 *
 * Multi-step wizard that guides new users through key features.
 * Shows role-specific content and tracks completion.
 *
 * Features:
 * - Multi-step wizard with progress indicator
 * - Role-specific content
 * - Skip/complete options
 * - Smooth animations
 * - Responsive design
 * - LocalStorage persistence
 *
 * @example
 * ```tsx
 * <OnboardingDialog
 *   role="tax_preparer"
 *   userName="John"
 *   onComplete={() => console.log('Done!')}
 * />
 * ```
 */
export function OnboardingDialog({ role, userName, onComplete }: OnboardingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  // Check if onboarding should be shown
  useEffect(() => {
    const completed = hasCompletedOnboarding(role);
    if (!completed) {
      const roleSteps = getOnboardingSteps(role);
      setSteps(roleSteps);
      const savedStep = getCurrentStep();
      setCurrentStepIndex(Math.min(savedStep, roleSteps.length - 1));
      setOpen(true);
    }
  }, [role]);

  // Save current step to localStorage
  useEffect(() => {
    if (open) {
      setCurrentStep(currentStepIndex);
    }
  }, [currentStepIndex, open]);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    markOnboardingComplete(role);
    setOpen(false);
    onComplete?.();
  };

  const handleComplete = () => {
    markOnboardingComplete(role);
    setOpen(false);
    onComplete?.();
  };

  const handleAction = () => {
    if (currentStep?.action?.href) {
      router.push(currentStep.action.href);
      handleComplete();
    }
  };

  if (!currentStep) return null;

  const Icon = ICON_MAP[currentStep.icon] || Sparkles;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-2xl">
              {isFirstStep && userName ? `Welcome, ${userName}!` : currentStep.title}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tour
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="py-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Title (if not first step) */}
          {!isFirstStep && (
            <h3 className="text-xl font-semibold text-center mb-3">{currentStep.title}</h3>
          )}

          {/* Description */}
          <DialogDescription className="text-center text-base leading-relaxed mb-6">
            {currentStep.description}
          </DialogDescription>

          {/* Action Button (if available) */}
          {currentStep.action && (
            <div className="flex justify-center">
              <Button onClick={handleAction} size="lg" className="gap-2">
                {currentStep.action.label}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStepIndex(index)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === currentStepIndex
                    ? 'w-8 bg-primary'
                    : index < currentStepIndex
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Next/Finish Button */}
          <Button onClick={handleNext} className="gap-2">
            {isLastStep ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to trigger onboarding for current user
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data: session } = useSession(); const user = session?.user;
 *   useOnboarding(user?.publicMetadata?.role as UserRole, user?.firstName);
 *
 *   return <div>Dashboard</div>;
 * }
 * ```
 */
export function useOnboarding(role?: UserRole, userName?: string) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (role && !hasCompletedOnboarding(role)) {
      setShouldShow(true);
    }
  }, [role]);

  return { shouldShow, role, userName };
}
