import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { safeJsonLdStringify } from '@/lib/utils/json-ld';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface TaxPreparerBreadcrumbProps {
  city: string;
  stateCode: string;
  citySlug: string;
  locale?: string;
}

/**
 * Breadcrumb navigation with BreadcrumbList structured data
 * Improves SEO by showing page hierarchy and enables Google rich snippets
 */
export default function TaxPreparerBreadcrumb({
  city,
  stateCode,
  citySlug,
  locale = 'en',
}: TaxPreparerBreadcrumbProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: `/${locale}` },
    { label: 'Careers', href: `/${locale}/careers` },
    { label: 'Tax Preparer Jobs', href: `/${locale}/careers/tax-preparer` },
    { label: `${city}, ${stateCode}`, href: `/${locale}/careers/tax-preparer/${citySlug}` },
  ];

  // BreadcrumbList structured data for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.label,
      item: `https://taxgeniuspro.tax${breadcrumb.href}`,
    })),
  };

  return (
    <>
      {/* BreadcrumbList structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbSchema) }}
      />

      {/* Visual breadcrumb navigation */}
      <nav
        aria-label="Breadcrumb"
        className="py-4 px-6 bg-muted/5 border-b border-border"
      >
        <ol className="flex items-center gap-2 max-w-6xl mx-auto text-sm">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {index === 0 && <Home className="w-4 h-4" />}
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {index === 0 && <Home className="w-4 h-4" />}
                  {breadcrumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
