/**
 * Safe JSON-LD serialization utility
 *
 * Properly escapes JSON for embedding in HTML script tags to prevent
 * XSS attacks and parsing errors from special characters.
 */

/**
 * Safely stringify an object for embedding in a script tag.
 * Escapes characters that could break HTML parsing or cause XSS.
 */
export function safeJsonLdStringify(obj: unknown): string {
  return JSON.stringify(obj)
    // Escape </script> tags to prevent premature script termination
    .replace(/<\/script/gi, '<\\/script')
    // Escape HTML comment delimiters
    .replace(/<!--/g, '<\\!--')
    // Escape stray < characters that could start tags
    .replace(/</g, '\\u003c')
    // Escape > characters for safety
    .replace(/>/g, '\\u003e')
    // Escape & characters
    .replace(/&/g, '\\u0026')
    // Escape line terminators that could break JSON parsing in some browsers
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Component-friendly wrapper that returns the props for dangerouslySetInnerHTML
 */
export function getJsonLdProps(schema: unknown): { __html: string } {
  return { __html: safeJsonLdStringify(schema) };
}
