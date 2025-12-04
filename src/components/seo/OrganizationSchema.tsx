/**
 * Organization JSON-LD Schema for SEO and LLM optimization
 * Provides sitewide authority signals to search engines and LLMs
 */
export default function OrganizationSchema() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tax Genius Pro',
    url: 'https://taxgeniuspro.tax',
    logo: 'https://taxgeniuspro.tax/tax-genius-logo.png',
    description:
      'Tax Genius Pro provides free training and certification for aspiring tax preparers across the United States. Earn $75,000-$150,000 annually working from home with flexible hours.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-404-627-1015',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Spanish'],
      areaServed: 'US',
    },
    sameAs: [
      'https://www.facebook.com/taxgeniuspro',
      'https://www.linkedin.com/company/taxgeniuspro',
      'https://twitter.com/taxgeniuspro',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    serviceArea: {
      '@type': 'Country',
      name: 'United States',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
    />
  );
}
