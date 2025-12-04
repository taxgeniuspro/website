/**
 * SEO Metadata Generator for TaxGeniusPro
 *
 * Generates Next.js metadata, Open Graph tags, Twitter Cards
 */

import { Metadata } from 'next';

const SITE_NAME = 'TaxGeniusPro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://taxgeniuspro.tax';
const DEFAULT_DESCRIPTION =
  'Professional tax services with IRS-certified preparers. Maximum refund guarantee, audit protection, year-round support. Get your free tax consultation today.';

export interface TaxPageMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'service';
  noindex?: boolean;
}

/**
 * Generate Next.js metadata for SEO optimization
 */
export function generateTaxMetadata(options: TaxPageMetadata): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = [],
    image,
    url,
    type = 'website',
    noindex = false,
  } = options;

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const ogImage = image || `${SITE_URL}/og-image-tax.png`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    ...(noindex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: fullUrl,
    },
  };
}

/**
 * Generate metadata for city landing pages
 */
export function generateCityLandingPageMetadata(
  cityName: string,
  state: string,
  serviceType: string,
  customTitle?: string,
  customDescription?: string
): Metadata {
  const serviceNames: Record<string, string> = {
    'personal-tax': 'Personal Tax Filing',
    'business-tax': 'Business Tax Services',
    'irs-resolution': 'IRS Tax Resolution',
    'tax-planning': 'Tax Planning Services',
  };

  const serviceName = serviceNames[serviceType] || 'Tax Services';

  const title = customTitle || `${serviceName} in ${cityName}, ${state}`;
  const description =
    customDescription ||
    `Expert ${serviceName.toLowerCase()} for ${cityName} residents. Maximum refund guarantee, IRS audit protection, free consultation. Get started today.`;

  const keywords = [
    `${serviceType.replace('-', ' ')} ${cityName}`,
    `tax services ${cityName}`,
    `${cityName} tax preparer`,
    `tax preparation ${cityName} ${state}`,
    'irs certified tax preparer',
    'maximum refund guarantee',
  ];

  return generateTaxMetadata({
    title,
    description,
    keywords,
    url: `/${serviceType}/${cityName.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'service',
  });
}

/**
 * Generate metadata for service pages
 */
export function generateServiceMetadata(
  serviceName: string,
  description?: string,
  keywords?: string[]
): Metadata {
  const defaultKeywords = [
    serviceName.toLowerCase(),
    'tax services',
    'irs certified',
    'tax preparation',
    'tax filing',
  ];

  return generateTaxMetadata({
    title: serviceName,
    description:
      description ||
      `Professional ${serviceName.toLowerCase()}. IRS-certified tax preparers, maximum refund guarantee, year-round support.`,
    keywords: keywords || defaultKeywords,
    url: `/${serviceName.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'service',
  });
}

/**
 * Truncate text to specified length (for meta descriptions)
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Generate keywords array from service and location data
 */
export function generateTaxKeywords(
  mainKeyword: string,
  location?: { city?: string; state?: string },
  additionalKeywords: string[] = []
): string[] {
  const base = [
    mainKeyword,
    `${mainKeyword} services`,
    `professional ${mainKeyword}`,
    'irs certified tax preparer',
    'maximum refund guarantee',
  ];

  if (location) {
    if (location.city) {
      base.push(
        `${mainKeyword} ${location.city}`,
        `${location.city} tax services`,
        `tax preparer ${location.city}`
      );
    }
    if (location.state) {
      base.push(`${mainKeyword} ${location.state}`, `${location.state} tax services`);
    }
  }

  return [...new Set([...base, ...additionalKeywords])];
}

export default generateTaxMetadata;
