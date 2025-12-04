/**
 * Tax Genius Pro - Schema Markup Generators
 *
 * Generates JSON-LD structured data for tax services
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://taxgeniuspro.tax';
const BUSINESS_NAME = 'Tax Genius Pro';
const PHONE = '+1-404-627-1015';
const ADDRESS = {
  street: '1632 Jonesboro Rd SE',
  city: 'Atlanta',
  state: 'GA',
  zip: '30315',
  country: 'US',
};

export interface FAQ {
  question: string;
  answer: string;
}

/**
 * Organization Schema for Homepage
 */
export function generateTaxGeniusOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'Professional tax preparation and filing services. IRS-certified tax experts providing personal tax, business tax, tax planning, audit protection, and IRS resolution services nationwide.',
    email: 'taxgenius.tax@gmail.com',
    telephone: PHONE,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: ADDRESS.country,
    },
    sameAs: [
      'https://www.facebook.com/Taxgeniusfb/',
      'https://www.instagram.com/taxgeniusig/',
      'https://www.linkedin.com/company/mytaxgenius',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE,
      contactType: 'customer service',
      areaServed: 'US',
      availableLanguage: ['English', 'Spanish'],
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '150',
    },
  };
}

/**
 * LocalBusiness Schema for Location Pages
 */
export function generateTaxGeniusLocalBusinessSchema(
  cityName: string,
  stateName: string,
  stateCode: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/locations/${cityName.toLowerCase().replace(/\s+/g, '-')}-${stateCode.toLowerCase()}#business`,
    name: `${BUSINESS_NAME} - ${cityName}, ${stateCode}`,
    description: `Professional tax preparation services in ${cityName}, ${stateName}. Expert tax preparers, guaranteed accuracy, maximum refunds. Personal and business tax filing available.`,
    url: `${SITE_URL}/locations/${cityName.toLowerCase().replace(/\s+/g, '-')}-${stateCode.toLowerCase()}`,
    telephone: PHONE,
    email: 'taxgenius.tax@gmail.com',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: ADDRESS.country,
    },
    areaServed: {
      '@type': 'City',
      name: cityName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityName,
        addressRegion: stateCode,
        addressCountry: 'US',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '150',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '17:00',
      },
    ],
  };
}

/**
 * FAQ Schema for Service Pages
 */
export function generateTaxGeniusFAQSchema(faqs: FAQ[]) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Review Schema for Individual Review
 */
export function generateReviewSchema(review: {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
    itemReviewed: {
      '@type': 'Organization',
      name: BUSINESS_NAME,
    },
  };
}

/**
 * AggregateRating Schema for Testimonials Page
 */
export function generateAggregateRatingSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS_NAME,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '150',
    },
  };
}

/**
 * Professional Service Schema for Tax Services
 */
export function generateProfessionalServiceSchema(
  serviceName: string,
  serviceDescription: string,
  serviceUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}${serviceUrl}#service`,
    name: serviceName,
    description: serviceDescription,
    url: `${SITE_URL}${serviceUrl}`,
    provider: {
      '@type': 'Organization',
      name: BUSINESS_NAME,
      telephone: PHONE,
    },
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    priceRange: '$$',
  };
}

/**
 * Breadcrumb Schema for Navigation
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
