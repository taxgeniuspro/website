import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingButtonProps extends ButtonProps {
  /**
   * Whether the button is in loading state
   */
  loading?: boolean;

  /**
   * Custom loading text (optional)
   */
  loadingText?: string;

  /**
   * Whether to show loading spinner
   * @default true
   */
  showSpinner?: boolean;
}

/**
 * LoadingButton Component
 *
 * Enhanced button with built-in loading state support.
 * Prevents double-clicks and provides clear visual feedback.
 *
 * Features:
 * - Automatic disabled state when loading
 * - Loading spinner
 * - Optional loading text
 * - Prevents double-submission
 * - Maintains button sizing during loading
 *
 * Best Practices:
 * - Always use for async actions (form submits, API calls)
 * - Provide clear loading text for long operations
 * - Prevents accidental double-clicks
 *
 * @example
 * ```tsx
 * const [loading, setLoading] = useState(false);
 *
 * <LoadingButton
 *   loading={loading}
 *   loadingText="Saving..."
 *   onClick={async () => {
 *     setLoading(true);
 *     await saveData();
 *     setLoading(false);
 *   }}
 * >
 *   Save
 * </LoadingButton>
 * ```
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      showSpinner = true,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(className)}
        {...props}
      >
        {loading && showSpinner && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
