'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  Save,
  FileSignature,
  History,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface FieldDefinition {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  section?: string;
  order: number;
  isRequired: boolean;
  validationRules?: any;
  placeholder?: string;
  helpText?: string;
  options?: any;
  dependsOn?: string;
  showWhen?: any;
  irsLineNumber?: string;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description?: string;
  category: string;
  taxYear: number;
  fieldDefinitions: FieldDefinition[];
}

interface ClientTaxForm {
  id: string;
  status: string;
  formData: Record<string, any>;
  notes?: string;
  progress: number;
  taxYear: number;
  lastEditedAt: string;
  lastEditedBy?: string;
  isLocked: boolean;
}

interface FormData {
  success: boolean;
  clientTaxForm: ClientTaxForm;
  taxForm: TaxForm;
  client: { id: string; name: string };
  preparer: { id: string; name: string; company?: string };
  signatures: Array<{
    id: string;
    signedBy: string;
    signedByRole: string;
    signedAt: string;
  }>;
  permissions: {
    canEdit: boolean;
    canSign: boolean;
  };
}

interface TaxFormEditorProps {
  token: string;
  onSign?: () => void;
  onViewHistory?: () => void;
}

export function TaxFormEditor({ token, onSign, onViewHistory }: TaxFormEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounce field values for auto-save (2 seconds)
  const debouncedFieldValues = useDebounce(fieldValues, 2000);

  // Fetch form data
  const fetchFormData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shared-forms/${token}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch form');
      }

      const data: FormData = await response.json();
      setFormData(data);
      setFieldValues(data.clientTaxForm.formData || {});
    } catch (error: any) {
      toast.error('Failed to load form', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Auto-save when field values change
  useEffect(() => {
    if (!formData || loading) return;

    const saveForm = async () => {
      try {
        setSaving(true);

        // Calculate progress (% of required fields filled)
        const requiredFields = formData.taxForm.fieldDefinitions.filter(f => f.isRequired);
        const filledFields = requiredFields.filter(f => {
          const value = fieldValues[f.fieldName];
          return value !== undefined && value !== null && value !== '';
        });
        const progress = Math.round((filledFields.length / requiredFields.length) * 100);

        const response = await fetch(`/api/shared-forms/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: fieldValues,
            progress,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save form');
        }

        const result = await response.json();
        setLastSaved(new Date());

        // Update form data with new status/progress
        setFormData(prev => prev ? {
          ...prev,
          clientTaxForm: {
            ...prev.clientTaxForm,
            progress: result.progress,
            status: result.status,
            lastEditedAt: result.lastEditedAt,
          },
        } : null);
      } catch (error: any) {
        toast.error('Failed to save changes', {
          description: error.message,
        });
      } finally {
        setSaving(false);
      }
    };

    saveForm();
  }, [debouncedFieldValues, formData, loading, token]);

  // Initial fetch
  useEffect(() => {
    fetchFormData();
  }, [fetchFormData]);

  // Validate field
  const validateField = (field: FieldDefinition, value: any): string | null => {
    if (field.isRequired && (!value || value === '')) {
      return 'This field is required';
    }

    if (!field.validationRules) return null;

    const rules = field.validationRules;

    // Min/max length for text
    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }

    // Min/max value for numbers
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      return `Minimum value is ${rules.min}`;
    }
    if (rules.max !== undefined && parseFloat(value) > rules.max) {
      return `Maximum value is ${rules.max}`;
    }

    // Pattern matching (regex)
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return rules.patternMessage || 'Invalid format';
      }
    }

    return null;
  };

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any, field: FieldDefinition) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));

    // Validate
    const error = validateField(field, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  // Render field based on type
  const renderField = (field: FieldDefinition) => {
    const value = fieldValues[field.fieldName] || '';
    const error = errors[field.fieldName];
    const isDisabled = formData?.clientTaxForm.isLocked || !formData?.permissions.canEdit;

    // Check conditional rendering
    if (field.dependsOn && field.showWhen) {
      const dependentValue = fieldValues[field.dependsOn];
      const shouldShow = field.showWhen[dependentValue];
      if (!shouldShow) return null;
    }

    const fieldId = `field-${field.fieldName}`;

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {field.fieldLabel}
            {field.isRequired && <span className="text-destructive ml-1">*</span>}
            {field.irsLineNumber && (
              <span className="text-xs text-muted-foreground ml-2">
                (Line {field.irsLineNumber})
              </span>
            )}
          </Label>
        </div>

        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}

        {/* Text input */}
        {(field.fieldType === 'text' || field.fieldType === 'email' || field.fieldType === 'ssn' || field.fieldType === 'ein') && (
          <Input
            id={fieldId}
            type={field.fieldType === 'ssn' || field.fieldType === 'ein' ? 'text' : field.fieldType}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={error ? 'border-destructive' : ''}
            maxLength={field.validationRules?.maxLength}
          />
        )}

        {/* Number/Currency input */}
        {(field.fieldType === 'number' || field.fieldType === 'currency') && (
          <Input
            id={fieldId}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={error ? 'border-destructive' : ''}
            step={field.fieldType === 'currency' ? '0.01' : '1'}
          />
        )}

        {/* Date input */}
        {field.fieldType === 'date' && (
          <Input
            id={fieldId}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field)}
            disabled={isDisabled}
            className={error ? 'border-destructive' : ''}
          />
        )}

        {/* Textarea */}
        {field.fieldType === 'textarea' && (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={error ? 'border-destructive' : ''}
            rows={3}
          />
        )}

        {/* Select dropdown */}
        {field.fieldType === 'select' && field.options && (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.fieldName, val, field)}
            disabled={isDisabled}
          >
            <SelectTrigger id={fieldId} className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options) ? (
                field.options.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : null}
            </SelectContent>
          </Select>
        )}

        {/* Checkbox */}
        {field.fieldType === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleFieldChange(field.fieldName, checked, field)}
              disabled={isDisabled}
            />
            <Label htmlFor={fieldId} className="text-sm font-normal cursor-pointer">
              {field.placeholder || 'Check this box'}
            </Label>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  // Group fields by section
  const groupedFields = formData?.taxForm.fieldDefinitions.reduce((acc, field) => {
    const section = field.section || 'General Information';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>) || {};

  // Sort sections and fields
  Object.keys(groupedFields).forEach(section => {
    groupedFields[section].sort((a, b) => a.order - b.order);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!formData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load form. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const hasClientSignature = formData.signatures.some(
    s => s.signedBy === formData.client.id
  );
  const hasPreparerSignature = formData.signatures.some(
    s => s.signedBy === formData.preparer.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">
                {formData.taxForm.formNumber} - {formData.taxForm.title}
              </CardTitle>
              <CardDescription className="mt-1">
                Tax Year {formData.clientTaxForm.taxYear} • {formData.client.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                formData.clientTaxForm.status === 'COMPLETED' ? 'default' :
                formData.clientTaxForm.status === 'IN_PROGRESS' ? 'secondary' :
                formData.clientTaxForm.status === 'REVIEWED' ? 'outline' :
                'secondary'
              }>
                {formData.clientTaxForm.status}
              </Badge>
              {formData.clientTaxForm.isLocked && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{formData.clientTaxForm.progress}%</span>
            </div>
            <Progress value={formData.clientTaxForm.progress} />
          </div>

          {/* Status indicators */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              {saving ? (
                <>
                  <Save className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Auto-save enabled</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              <span className="text-muted-foreground">
                Signatures: {hasClientSignature && hasPreparerSignature ? '2/2' :
                           hasClientSignature || hasPreparerSignature ? '1/2' : '0/2'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {formData.permissions.canSign && onSign && (
              <Button onClick={onSign} variant="default" size="sm" className="gap-2">
                <FileSignature className="h-4 w-4" />
                Sign Form
              </Button>
            )}
            {onViewHistory && (
              <Button onClick={onViewHistory} variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                View History
              </Button>
            )}
            {formData.taxForm.category && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={`#`} download>
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lock notice */}
      {formData.clientTaxForm.isLocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This form has been reviewed and is now locked. No further edits can be made.
          </AlertDescription>
        </Alert>
      )}

      {/* Notes from preparer */}
      {formData.clientTaxForm.notes && (
        <Alert>
          <AlertDescription>
            <strong>Note from {formData.preparer.name}:</strong> {formData.clientTaxForm.notes}
          </AlertDescription>
        </Alert>
      )}

      {/* Form fields grouped by section */}
      {Object.entries(groupedFields).map(([section, fields]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="text-lg">{section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map(field => renderField(field))}
          </CardContent>
        </Card>
      ))}

      {/* Signatures section */}
      {formData.signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.signatures.map(sig => (
              <div key={sig.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <span className="font-medium">{sig.signedByRole}</span>
                  <span className="text-muted-foreground"> signed this form</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(sig.signedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
