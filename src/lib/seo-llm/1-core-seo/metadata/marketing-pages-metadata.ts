import type { Metadata } from 'next';
import { generateMetadata } from './metadata';

export const aboutMetadata: Metadata = generateMetadata({
  title: 'About Tax Genius Pro - Professional Tax Services',
  description:
    'Learn about Tax Genius Pro, your trusted partner for professional tax preparation and filing. IRS-certified tax experts, guaranteed accuracy, and personalized service since our founding.',
  keywords: [
    'about tax genius pro',
    'tax professional team',
    'certified tax experts',
    'tax preparation company',
    'tax service provider',
    'IRS certified professionals',
  ],
  url: '/about',
});

export const contactMetadata: Metadata = generateMetadata({
  title: 'Contact Us - Tax Genius Pro',
  description:
    'Get in touch with Tax Genius Pro. Call +1 404-627-1015 or visit us at 1632 Jonesboro Rd SE, Atlanta, GA 30315. Mon-Fri 9AM-7PM, Sat 10AM-5PM. Expert tax help available.',
  keywords: [
    'contact tax genius pro',
    'tax help phone number',
    'tax preparation contact',
    'tax expert contact',
    'Atlanta tax services',
    'tax professional contact',
  ],
  url: '/contact',
});

export const blogMetadata: Metadata = generateMetadata({
  title: 'Tax Tips & Advice Blog - Tax Genius Pro',
  description:
    'Expert tax tips, filing advice, IRS updates, and tax planning strategies from certified tax professionals. Stay informed with the latest tax news and money-saving tips.',
  keywords: [
    'tax tips',
    'tax advice',
    'tax blog',
    'tax filing tips',
    'IRS updates',
    'tax planning advice',
    'tax news',
    'tax saving tips',
  ],
  url: '/blog',
});

export const testimonialsMetadata: Metadata = generateMetadata({
  title: 'Client Testimonials & Reviews - Tax Genius Pro',
  description:
    'Read real client testimonials and reviews about Tax Genius Pro. 4.9/5 rating from 150+ satisfied customers. See why thousands trust us with their tax preparation.',
  keywords: [
    'tax genius pro reviews',
    'tax preparer testimonials',
    'customer reviews',
    'tax service ratings',
    'client testimonials',
    'tax professional reviews',
  ],
  url: '/testimonials',
});

export const helpMetadata: Metadata = generateMetadata({
  title: 'Help Center & Tax FAQ - Tax Genius Pro',
  description:
    'Get answers to common tax questions. Access our comprehensive help center with guides, FAQs, and resources for tax filing, preparation, and planning.',
  keywords: [
    'tax help center',
    'tax FAQ',
    'tax questions',
    'tax filing help',
    'tax preparation guide',
    'tax assistance',
  ],
  url: '/help',
});

export const supportMetadata: Metadata = generateMetadata({
  title: 'Customer Support - Tax Genius Pro',
  description:
    'Need help? Contact our customer support team for assistance with tax filing, account questions, or technical issues. Fast, friendly support from tax experts.',
  keywords: [
    'tax support',
    'customer support',
    'tax help desk',
    'tax filing support',
    'technical support',
    'tax assistance',
  ],
  url: '/support',
});

export const taxCalculatorMetadata: Metadata = generateMetadata({
  title: 'Free Tax Calculator - Estimate Your Tax Refund',
  description:
    'Calculate your tax refund instantly with our free tax calculator. Estimate your federal and state tax return based on income, deductions, and credits.',
  keywords: [
    'tax calculator',
    'tax refund calculator',
    'free tax calculator',
    'tax estimator',
    'refund calculator',
    'tax return calculator',
  ],
  url: '/tax-calculator',
});

export const calculatorMetadata: Metadata = generateMetadata({
  title: 'Tax Refund Calculator - Tax Genius Pro',
  description:
    'Free tax refund calculator to estimate your tax return. Quick, accurate calculations for federal and state taxes. See how much you could get back.',
  keywords: [
    'refund calculator',
    'tax calculator',
    'calculate tax refund',
    'tax estimator tool',
    'free calculator',
  ],
  url: '/calculator',
});

export const taxGuideMetadata: Metadata = generateMetadata({
  title: 'Complete Tax Filing Guide - Tax Genius Pro',
  description:
    'Comprehensive tax filing guide with step-by-step instructions, tips, deadlines, and best practices. Everything you need to know about filing your taxes.',
  keywords: [
    'tax filing guide',
    'tax guide',
    'how to file taxes',
    'tax preparation guide',
    'tax tips guide',
    'tax filing instructions',
  ],
  url: '/tax-guide',
});

export const guideMetadata: Metadata = generateMetadata({
  title: 'Tax Preparation Guide - Expert Tips & Resources',
  description:
    'Expert tax preparation guide with tips, checklists, and resources. Learn how to maximize deductions, avoid mistakes, and get the biggest refund.',
  keywords: [
    'tax prep guide',
    'tax preparation tips',
    'tax guide resources',
    'tax filing checklist',
  ],
  url: '/guide',
});

export const findRefundMetadata: Metadata = generateMetadata({
  title: 'Find Your Tax Refund - Track Refund Status',
  description:
    "Track your tax refund status and find out when you'll receive your money. Check IRS refund status, state refund tracking, and get refund updates.",
  keywords: [
    'find tax refund',
    'track refund',
    'refund status',
    'where is my refund',
    'IRS refund tracker',
    'check refund status',
  ],
  url: '/find-a-refund',
});

export const privacyMetadata: Metadata = generateMetadata({
  title: 'Privacy Policy - Tax Genius Pro',
  description:
    'Tax Genius Pro privacy policy. Learn how we protect your personal and tax information, data security practices, and your privacy rights.',
  keywords: ['privacy policy', 'data protection', 'tax privacy', 'information security'],
  url: '/privacy',
  noindex: false,
});

export const termsMetadata: Metadata = generateMetadata({
  title: 'Terms of Service - Tax Genius Pro',
  description:
    'Tax Genius Pro terms of service and user agreement. Read our terms, conditions, and policies for using our tax preparation services.',
  keywords: ['terms of service', 'user agreement', 'terms and conditions', 'service terms'],
  url: '/terms',
  noindex: false,
});

export const securityMetadata: Metadata = generateMetadata({
  title: 'Security & Data Protection - Tax Genius Pro',
  description:
    'Learn about our security measures and data protection practices. Bank-level encryption, secure file transfer, and IRS-approved security standards.',
  keywords: [
    'tax data security',
    'secure tax filing',
    'data protection',
    'tax information security',
  ],
  url: '/security',
});

export const accessibilityMetadata: Metadata = generateMetadata({
  title: 'Accessibility Statement - Tax Genius Pro',
  description:
    'Tax Genius Pro accessibility statement. Our commitment to making tax services accessible to everyone, including people with disabilities.',
  keywords: ['accessibility', 'ADA compliance', 'web accessibility', 'inclusive design'],
  url: '/accessibility',
  noindex: false,
});
