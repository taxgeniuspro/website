/**
 * Skip to Main Content Link
 *
 * WCAG 2.4.1: Bypass Blocks
 * Allows keyboard users to skip repetitive navigation and jump directly to main content.
 *
 * The link is visually hidden until focused, then appears prominently.
 * Requires a matching id="main-content" on the <main> element.
 */

'use client';

export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
        focus:px-4 focus:py-2
        focus:bg-primary focus:text-primary-foreground
        focus:rounded-md focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        font-medium
      "
    >
      Skip to main content
    </a>
  );
}
