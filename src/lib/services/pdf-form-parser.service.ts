/**
 * PDF Form Parser Service
 *
 * Extracts fillable form fields from PDF documents
 * Supports text fields, checkboxes, radio buttons, and dropdowns
 * Uses pdf-lib for PDF manipulation
 */

import {
  PDFDocument,
  PDFForm,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib';
import { logger } from '@/lib/logger';

export interface PDFFormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  value?: string | boolean;
  options?: string[]; // For dropdown and radio
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  multiline?: boolean;
  page?: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ParsedPDFForm {
  fields: PDFFormField[];
  totalFields: number;
  fillableFields: number;
  formHasFields: boolean;
}

/**
 * Parse a PDF file and extract all form fields
 */
export async function parsePDFFormFields(pdfBuffer: Buffer): Promise<ParsedPDFForm> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    // Get all form fields
    const formFields = form.getFields();
    const fields: PDFFormField[] = [];

    logger.info('Parsing PDF form', {
      totalPages: pdfDoc.getPageCount(),
      totalFields: formFields.length,
    });

    // Process each field
    for (const field of formFields) {
      const fieldName = field.getName();
      const fieldType = getFieldType(field);

      if (!fieldType) {
        logger.warn('Unknown field type', { fieldName });
        continue;
      }

      const parsedField: PDFFormField = {
        name: fieldName,
        type: fieldType,
        readOnly: field.isReadOnly(),
      };

      // Extract field-specific properties
      if (field instanceof PDFTextField) {
        const textField = field as PDFTextField;
        parsedField.value = textField.getText() || '';
        parsedField.maxLength = textField.getMaxLength() || undefined;
        parsedField.multiline = textField.isMultiline();
      } else if (field instanceof PDFCheckBox) {
        const checkbox = field as PDFCheckBox;
        parsedField.value = checkbox.isChecked();
      } else if (field instanceof PDFDropdown) {
        const dropdown = field as PDFDropdown;
        parsedField.options = dropdown.getOptions();
        parsedField.value = dropdown.getSelected().join(', ');
      } else if (field instanceof PDFRadioGroup) {
        const radio = field as PDFRadioGroup;
        parsedField.options = radio.getOptions();
        parsedField.value = radio.getSelected() || '';
      }

      fields.push(parsedField);
    }

    const fillableFields = fields.filter((f) => !f.readOnly).length;

    return {
      fields,
      totalFields: formFields.length,
      fillableFields,
      formHasFields: formFields.length > 0,
    };
  } catch (error) {
    logger.error('Error parsing PDF form fields', { error });
    throw new Error('Failed to parse PDF form fields');
  }
}

/**
 * Fill PDF form fields with provided data
 */
export async function fillPDFForm(
  pdfBuffer: Buffer,
  formData: Record<string, string | boolean>
): Promise<Buffer> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    logger.info('Filling PDF form', {
      fieldsToFill: Object.keys(formData).length,
    });

    // Fill each field
    for (const [fieldName, fieldValue] of Object.entries(formData)) {
      try {
        const field = form.getField(fieldName);

        if (field instanceof PDFTextField) {
          const textField = field as PDFTextField;
          if (!textField.isReadOnly()) {
            textField.setText(String(fieldValue));
          }
        } else if (field instanceof PDFCheckBox) {
          const checkbox = field as PDFCheckBox;
          if (!checkbox.isReadOnly()) {
            if (fieldValue === true || fieldValue === 'true' || fieldValue === 'on') {
              checkbox.check();
            } else {
              checkbox.uncheck();
            }
          }
        } else if (field instanceof PDFDropdown) {
          const dropdown = field as PDFDropdown;
          if (!dropdown.isReadOnly()) {
            dropdown.select(String(fieldValue));
          }
        } else if (field instanceof PDFRadioGroup) {
          const radio = field as PDFRadioGroup;
          if (!radio.isReadOnly()) {
            radio.select(String(fieldValue));
          }
        }
      } catch (fieldError) {
        logger.warn('Error filling field', { fieldName, error: fieldError });
        // Continue with other fields even if one fails
      }
    }

    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error('Error filling PDF form', { error });
    throw new Error('Failed to fill PDF form');
  }
}

/**
 * Flatten PDF form (make fields non-editable)
 */
export async function flattenPDFForm(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    // Flatten the form (makes all fields read-only)
    form.flatten();

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error('Error flattening PDF form', { error });
    throw new Error('Failed to flatten PDF form');
  }
}

/**
 * Get form field completion percentage
 */
export function calculateFormCompletionPercentage(
  fields: PDFFormField[],
  formData: Record<string, string | boolean>
): number {
  const fillableFields = fields.filter((f) => !f.readOnly);

  if (fillableFields.length === 0) {
    return 0;
  }

  const filledFields = fillableFields.filter((field) => {
    const value = formData[field.name];

    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'boolean') {
      return true; // Checkboxes are considered filled if they have any value
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return false;
  });

  return Math.round((filledFields.length / fillableFields.length) * 100);
}

/**
 * Validate form data against field requirements
 */
export function validateFormData(
  fields: PDFFormField[],
  formData: Record<string, string | boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.readOnly) continue;

    const value = formData[field.name];

    // Check if required field is filled
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field.name}" is required`);
    }

    // Check max length for text fields
    if (field.type === 'text' && field.maxLength && typeof value === 'string') {
      if (value.length > field.maxLength) {
        errors.push(`Field "${field.name}" exceeds maximum length of ${field.maxLength}`);
      }
    }

    // Check dropdown/radio options
    if ((field.type === 'dropdown' || field.type === 'radio') && field.options) {
      if (value && typeof value === 'string' && !field.options.includes(value)) {
        errors.push(`Invalid option for field "${field.name}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Determine field type from PDF field
 */
function getFieldType(field: any): PDFFormField['type'] | null {
  if (field instanceof PDFTextField) {
    return 'text';
  } else if (field instanceof PDFCheckBox) {
    return 'checkbox';
  } else if (field instanceof PDFDropdown) {
    return 'dropdown';
  } else if (field instanceof PDFRadioGroup) {
    return 'radio';
  }
  return null;
}

/**
 * Extract field metadata for a specific form
 * This can be cached in the database to avoid re-parsing
 */
export async function extractFormMetadata(pdfBuffer: Buffer): Promise<{
  hasFormFields: boolean;
  fieldCount: number;
  fieldNames: string[];
  fieldTypes: Record<string, string>;
}> {
  try {
    const parsed = await parsePDFFormFields(pdfBuffer);

    return {
      hasFormFields: parsed.formHasFields,
      fieldCount: parsed.totalFields,
      fieldNames: parsed.fields.map((f) => f.name),
      fieldTypes: parsed.fields.reduce(
        (acc, f) => {
          acc[f.name] = f.type;
          return acc;
        },
        {} as Record<string, string>
      ),
    };
  } catch (error) {
    logger.error('Error extracting form metadata', { error });
    return {
      hasFormFields: false,
      fieldCount: 0,
      fieldNames: [],
      fieldTypes: {},
    };
  }
}
