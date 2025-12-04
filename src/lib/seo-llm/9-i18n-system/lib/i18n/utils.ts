import type { Locale } from '@/i18n'

/**
 * Translation field structure for database models
 */
export interface TranslationFields {
  [locale: string]: {
    [key: string]: string | undefined
  }
}

/**
 * Get localized field value from a model's translations JSON
 * Falls back to the base field value if translation doesn't exist
 *
 * @param model - The database model with translations field
 * @param fieldName - The field to translate (e.g., 'name', 'description')
 * @param locale - The desired locale
 * @returns Translated value or fallback to base field
 */
export function getLocalizedField<T extends Record<string, any>>(
  model: T,
  fieldName: keyof T,
  locale: Locale
): string {
  // Try to get from translations object first
  if (model.translations && typeof model.translations === 'object') {
    const translations = model.translations as TranslationFields
    const localeTranslations = translations[locale]

    if (localeTranslations && localeTranslations[fieldName as string]) {
      return localeTranslations[fieldName as string] as string
    }
  }

  // Fallback to base field
  return (model[fieldName] as string) || ''
}

/**
 * Get all localized fields from a model
 *
 * @param model - The database model with translations field
 * @param fields - Array of field names to translate
 * @param locale - The desired locale
 * @returns Object with localized field values
 */
export function getLocalizedFields<T extends Record<string, any>>(
  model: T,
  fields: (keyof T)[],
  locale: Locale
): Partial<T> {
  const result: Partial<T> = {}

  fields.forEach((field) => {
    result[field] = getLocalizedField(model, field, locale) as T[keyof T]
  })

  return result
}

/**
 * Localize a Product model
 */
export function localizeProduct(
  product: any,
  locale: Locale
): {
  name: string
  description: string | null
  shortDescription: string | null
} {
  return {
    name: getLocalizedField(product, 'name', locale),
    description: getLocalizedField(product, 'description', locale) || null,
    shortDescription:
      getLocalizedField(product, 'shortDescription', locale) || null,
  }
}

/**
 * Localize a ProductCategory model
 */
export function localizeCategory(
  category: any,
  locale: Locale
): {
  name: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
} {
  return {
    name: getLocalizedField(category, 'name', locale),
    description: getLocalizedField(category, 'description', locale) || null,
    metaTitle: getLocalizedField(category, 'metaTitle', locale) || null,
    metaDescription:
      getLocalizedField(category, 'metaDescription', locale) || null,
  }
}

/**
 * Localize an AddOn model
 */
export function localizeAddOn(
  addon: any,
  locale: Locale
): {
  name: string
  description: string | null
  tooltipText: string | null
} {
  return {
    name: getLocalizedField(addon, 'name', locale),
    description: getLocalizedField(addon, 'description', locale) || null,
    tooltipText: getLocalizedField(addon, 'tooltipText', locale) || null,
  }
}

/**
 * Localize a PaperStock model
 */
export function localizePaperStock(
  paperStock: any,
  locale: Locale
): {
  name: string
  tooltipText: string | null
} {
  return {
    name: getLocalizedField(paperStock, 'name', locale),
    tooltipText: getLocalizedField(paperStock, 'tooltipText', locale) || null,
  }
}

/**
 * Batch localize an array of models
 */
export function localizeArray<T extends Record<string, any>>(
  items: T[],
  localizeFunc: (item: T, locale: Locale) => Partial<T>,
  locale: Locale
): T[] {
  return items.map((item) => ({
    ...item,
    ...localizeFunc(item, locale),
  }))
}
