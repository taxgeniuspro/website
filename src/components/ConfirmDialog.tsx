'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback when user confirms the action
   */
  onConfirm: () => void | Promise<void>;

  /**
   * Dialog title
   */
  title: string;

  /**
   * Dialog description explaining what will happen
   */
  description: string;

  /**
   * Confirm button text
   * @default "Continue"
   */
  confirmText?: string;

  /**
   * Cancel button text
   * @default "Cancel"
   */
  cancelText?: string;

  /**
   * Variant determines styling and icon
   * - destructive: Red, danger icon (for deletes)
   * - warning: Yellow, warning icon (for risky actions)
   * - info: Blue, info icon (for important confirmations)
   * @default "destructive"
   */
  variant?: 'destructive' | 'warning' | 'info';

  /**
   * Whether the confirm action is loading
   */
  loading?: boolean;
}

/**
 * ConfirmDialog Component
 *
 * A reusable confirmation dialog for destructive or important actions.
 * Uses AlertDialog from shadcn/ui for accessibility.
 *
 * Features:
 * - Multiple variants (destructive, warning, info)
 * - Loading state support
 * - Keyboard navigation (Escape to cancel, Enter to confirm)
 * - Accessible (ARIA labels, focus management)
 * - Visual warnings with icons
 *
 * @example
 * ```tsx
 * const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 *
 * <ConfirmDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   onConfirm={async () => {
 *     await deleteItem(itemId);
 *     setDeleteDialogOpen(false);
 *   }}
 *   title="Delete Email Template"
 *   description="Are you sure you want to delete this template? This action cannot be undone."
 *   confirmText="Delete"
 *   variant="destructive"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    destructive: {
      icon: Trash2,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-600',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-600',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', style.iconBg)}>
              <Icon className={cn('h-6 w-6', style.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={cn(style.buttonClass)}
          >
            {loading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for managing confirmation dialog state
 *
 * @example
 * ```tsx
 * const { confirmDialog, openConfirmDialog } = useConfirmDialog();
 *
 * <Button onClick={() => openConfirmDialog({
 *   title: 'Delete Item',
 *   description: 'This action cannot be undone.',
 *   onConfirm: async () => await deleteItem(),
 * })}>
 *   Delete
 * </Button>
 *
 * {confirmDialog}
 * ```
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [loading, setLoading] = useState(false);

  const openConfirmDialog = (config: Omit<typeof dialogState, 'open'>) => {
    setDialogState({ ...config, open: true });
  };

  const closeConfirmDialog = () => {
    setDialogState((prev) => ({ ...prev, open: false }));
    setLoading(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await dialogState.onConfirm();
      closeConfirmDialog();
    } catch (error) {
      // Error handled by caller
      setLoading(false);
    }
  };

  const confirmDialog = (
    <ConfirmDialog
      open={dialogState.open}
      onOpenChange={closeConfirmDialog}
      onConfirm={handleConfirm}
      title={dialogState.title}
      description={dialogState.description}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      loading={loading}
    />
  );

  return {
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
  };
}

// Re-export useState for the hook
import { useState } from 'react';
