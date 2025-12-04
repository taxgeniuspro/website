'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ValidationRule = {
  test: (value: string) => boolean;
  message: string;
};

interface FormFieldProps {
  /**
   * Field label
   */
  label: string;

  /**
   * Field name/id
   */
  name: string;

  /**
   * Field value
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Field type
   */
  type?: 'text' | 'email' | 'password' | 'textarea' | 'url' | 'tel';

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether field is required
   */
  required?: boolean;

  /**
   * Validation rules
   */
  rules?: ValidationRule[];

  /**
   * Whether to show validation on blur (default: true)
   */
  validateOnBlur?: boolean;

  /**
   * Whether to show validation on change (default: true after first blur)
   */
  validateOnChange?: boolean;

  /**
   * External error message (from server)
   */
  error?: string;

  /**
   * Help text
   */
  helpText?: string;

  /**
   * Whether field is disabled
   */
  disabled?: boolean;

  /**
   * Number of rows for textarea
   */
  rows?: number;

  /**
   * Async validation function
   */
  asyncValidation?: (value: string) => Promise<{ valid: boolean; message?: string }>;

  /**
   * Debounce time for async validation (ms)
   */
  asyncDebounceMs?: number;
}

/**
 * FormField Component
 *
 * Enhanced form field with real-time validation feedback.
 * Follows industry best practices for inline validation.
 *
 * Features:
 * - Real-time validation (on blur, then on change)
 * - Async validation support (e.g., check username availability)
 * - Clear visual feedback (success, error states)
 * - Accessible error messages
 * - Debounced async validation
 *
 * Best Practices:
 * - Shows validation after user leaves field (on blur)
 * - Then shows validation as user types (on change)
 * - Clear error messages with icons
 * - Success confirmation when valid
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   name="email"
 *   type="email"
 *   value={email}
 *   onChange={setEmail}
 *   required
 *   rules={[
 *     {
 *       test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
 *       message: 'Please enter a valid email address'
 *     }
 *   ]}
 * />
 * ```
 */
export function FormField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  rules = [],
  validateOnBlur = true,
  validateOnChange = true,
  error: externalError,
  helpText,
  disabled = false,
  rows = 4,
  asyncValidation,
  asyncDebounceMs = 500,
}: FormFieldProps) {
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Validate field
  const validate = (val: string): string | null => {
    // Required check
    if (required && !val.trim()) {
      return `${label} is required`;
    }

    // Custom rules
    for (const rule of rules) {
      if (!rule.test(val)) {
        return rule.message;
      }
    }

    return null;
  };

  // Handle async validation with debounce
  useEffect(() => {
    if (!asyncValidation || !value || !touched) return;

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await asyncValidation(value);
        if (!result.valid) {
          setValidationError(result.message || 'Validation failed');
          setIsValid(false);
        } else {
          const syncError = validate(value);
          setValidationError(syncError);
          setIsValid(!syncError);
        }
      } catch (error) {
        setValidationError('Validation failed');
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    }, asyncDebounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, touched, asyncValidation, asyncDebounceMs]);

  // Handle synchronous validation
  useEffect(() => {
    if (!touched || asyncValidation) return;

    const error = validate(value);
    setValidationError(error);
    setIsValid(!error && value.length > 0);
  }, [value, touched]);

  const handleBlur = () => {
    if (validateOnBlur) {
      setTouched(true);
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);

    if (touched && validateOnChange) {
      const error = validate(newValue);
      setValidationError(error);
      setIsValid(!error && newValue.length > 0);
    }
  };

  const showError = touched && (validationError || externalError);
  const showSuccess = touched && isValid && !validationError && !externalError && !isValidating;

  const InputComponent = type === 'textarea' ? Textarea : Input;

  return (
    <div className="space-y-2">
      {/* Label */}
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Input Field */}
      <div className="relative">
        <InputComponent
          id={name}
          name={name}
          type={type === 'textarea' ? undefined : type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={type === 'textarea' ? rows : undefined}
          className={cn(
            'pr-10 transition-colors',
            showError && 'border-red-500 focus-visible:ring-red-500',
            showSuccess && 'border-green-500 focus-visible:ring-green-500'
          )}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />

        {/* Validation Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isValidating && showSuccess && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {!isValidating && showError && (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>

      {/* Help Text */}
      {!showError && helpText && (
        <p id={`${name}-help`} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {showError && (
        <p
          id={`${name}-error`}
          className="text-xs text-red-600 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" />
          {validationError || externalError}
        </p>
      )}
    </div>
  );
}

/**
 * Common validation rules for reuse
 */
export const ValidationRules = {
  email: {
    test: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Please enter a valid email address',
  },
  phone: {
    test: (value: string) => /^[\d\s\-\+\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 10,
    message: 'Please enter a valid phone number',
  },
  url: {
    test: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Please enter a valid URL',
  },
  minLength: (length: number) => ({
    test: (value: string) => value.length >= length,
    message: `Must be at least ${length} characters`,
  }),
  maxLength: (length: number) => ({
    test: (value: string) => value.length <= length,
    message: `Must be no more than ${length} characters`,
  }),
  pattern: (regex: RegExp, message: string) => ({
    test: (value: string) => regex.test(value),
    message,
  }),
};
