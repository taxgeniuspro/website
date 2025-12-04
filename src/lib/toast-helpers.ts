/**
 * Toast Notification Helpers
 *
 * Pre-configured toast patterns for common scenarios.
 * Provides consistent UX across the application.
 *
 * Usage:
 * ```tsx
 * import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
 *
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     showSuccessToast('Data saved successfully');
 *   } catch (error) {
 *     showErrorToast('Failed to save data');
 *   }
 * };
 * ```
 */

import { toast } from '@/hooks/use-toast';

/**
 * Success toast (green checkmark)
 */
export function showSuccessToast(message: string, description?: string) {
  return toast({
    title: message,
    description,
    variant: 'default',
    className: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50',
  });
}

/**
 * Error toast (red alert)
 */
export function showErrorToast(message: string, description?: string) {
  return toast({
    title: message,
    description,
    variant: 'destructive',
  });
}

/**
 * Warning toast (yellow warning)
 */
export function showWarningToast(message: string, description?: string) {
  return toast({
    title: message,
    description,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50',
  });
}

/**
 * Info toast (blue info)
 */
export function showInfoToast(message: string, description?: string) {
  return toast({
    title: message,
    description,
    className: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50',
  });
}

/**
 * Loading toast (with spinner)
 * Returns toast ID for dismissal when operation completes
 */
export function showLoadingToast(message: string, description?: string) {
  return toast({
    title: message,
    description,
    duration: Infinity, // Don't auto-dismiss
  });
}

/**
 * Promise toast - Shows loading, then success or error
 * Industry standard pattern from Sonner/React Hot Toast
 *
 * @example
 * ```tsx
 * showPromiseToast(
 *   saveData(),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved successfully!',
 *     error: 'Failed to save',
 *   }
 * );
 * ```
 */
export async function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
): Promise<T> {
  const loadingToast = showLoadingToast(messages.loading);

  try {
    const data = await promise;
    loadingToast.dismiss();

    const successMessage =
      typeof messages.success === 'function'
        ? messages.success(data)
        : messages.success;

    showSuccessToast(successMessage);
    return data;
  } catch (error) {
    loadingToast.dismiss();

    const errorMessage =
      typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error;

    showErrorToast(errorMessage);
    throw error;
  }
}

/**
 * Common toast patterns for specific actions
 */
export const Toasts = {
  // Save actions
  saved: () => showSuccessToast('Saved successfully'),
  saveError: () => showErrorToast('Failed to save', 'Please try again'),

  // Delete actions
  deleted: (itemName: string = 'Item') => showSuccessToast(`${itemName} deleted successfully`),
  deleteError: () => showErrorToast('Failed to delete', 'Please try again'),

  // Create actions
  created: (itemName: string = 'Item') => showSuccessToast(`${itemName} created successfully`),
  createError: () => showErrorToast('Failed to create', 'Please try again'),

  // Update actions
  updated: (itemName: string = 'Item') => showSuccessToast(`${itemName} updated successfully`),
  updateError: () => showErrorToast('Failed to update', 'Please try again'),

  // Copy actions
  copied: () => showSuccessToast('Copied to clipboard'),
  copyError: () => showErrorToast('Failed to copy', 'Please try again'),

  // Upload actions
  uploaded: () => showSuccessToast('File uploaded successfully'),
  uploadError: () => showErrorToast('Upload failed', 'Please check your file and try again'),

  // Download actions
  downloaded: () => showSuccessToast('Download started'),
  downloadError: () => showErrorToast('Download failed', 'Please try again'),

  // Send actions
  sent: () => showSuccessToast('Sent successfully'),
  sendError: () => showErrorToast('Failed to send', 'Please try again'),

  // Form validation
  formError: () => showErrorToast('Please fix the errors in the form'),
  requiredFields: () => showWarningToast('Please fill in all required fields'),

  // Network errors
  networkError: () => showErrorToast('Network error', 'Please check your connection and try again'),
  serverError: () => showErrorToast('Server error', 'Please try again later'),
  unauthorized: () => showErrorToast('Unauthorized', 'Please log in again'),

  // Permissions
  permissionDenied: () => showErrorToast('Permission denied', 'You don\'t have access to this feature'),

  // Coming soon
  comingSoon: (featureName?: string) =>
    showInfoToast(
      'Coming Soon',
      featureName ? `${featureName} will be available soon!` : 'This feature is coming soon!'
    ),
};

/**
 * Utility to wrap async functions with toast notifications
 *
 * @example
 * ```tsx
 * const handleSave = withToast(
 *   async () => await saveData(),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved!',
 *     error: 'Failed to save',
 *   }
 * );
 * ```
 */
export function withToast<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  messages: {
    loading: string;
    success: string | ((result: Awaited<ReturnType<T>>) => string);
    error: string | ((error: any) => string);
  }
): T {
  return (async (...args: Parameters<T>) => {
    return showPromiseToast(fn(...args), messages);
  }) as T;
}
