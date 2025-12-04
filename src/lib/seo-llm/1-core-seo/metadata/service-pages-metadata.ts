import type { Metadata } from 'next';
import { generateMetadata } from './metadata';

export const personalTaxMetadata: Metadata = generateMetadata({
  title: 'Personal Tax Filing & Preparation Services',
  description:
    'Professional personal tax preparation and filing services. Expert CPAs handle your individual tax return with guaranteed accuracy and maximum refunds. Simple, secure, and stress-free tax filing.',
  keywords: [
    'personal tax filing',
    'individual tax return',
    'personal tax preparation',
    'tax filing service',
    'file taxes online',
    'personal tax expert',
    'income tax filing',
    'tax return preparation',
  ],
  url: '/personal-tax-filing',
});

export const businessTaxMetadata: Metadata = generateMetadata({
  title: 'Business Tax Preparation & Filing Services',
  description:
    'Expert business tax preparation for LLCs, S-Corps, C-Corps, and partnerships. Maximize deductions, minimize liability. Certified tax professionals handle all business tax filings.',
  keywords: [
    'business tax preparation',
    'business tax filing',
    'corporate tax services',
    'LLC tax filing',
    'S-Corp tax return',
    'small business taxes',
    'business tax expert',
    'commercial tax preparation',
  ],
  url: '/business-tax',
});

export const taxPlanningMetadata: Metadata = generateMetadata({
  title: 'Tax Planning & Strategy Services',
  description:
    'Strategic tax planning services to minimize your tax liability year-round. Expert tax advisors create personalized strategies for long-term tax savings and financial growth.',
  keywords: [
    'tax planning',
    'tax strategy',
    'tax planning services',
    'tax advisor',
    'tax reduction strategies',
    'year-round tax planning',
    'tax optimization',
    'strategic tax planning',
  ],
  url: '/tax-planning',
});

export const auditProtectionMetadata: Metadata = generateMetadata({
  title: 'Audit Protection & Defense Services',
  description:
    'Professional IRS audit protection and defense services. Expert representation, documentation support, and peace of mind. Protect yourself from IRS audits with certified tax professionals.',
  keywords: [
    'audit protection',
    'IRS audit defense',
    'audit representation',
    'tax audit help',
    'IRS audit services',
    'audit defense services',
    'tax audit protection',
    'IRS representation',
  ],
  url: '/audit-protection',
});

export const irsResolutionMetadata: Metadata = generateMetadata({
  title: 'IRS Tax Resolution & Problem Solutions',
  description:
    'Expert IRS tax problem resolution services. Settle back taxes, negotiate payment plans, remove liens and levies. Certified tax professionals resolve your IRS issues.',
  keywords: [
    'IRS resolution',
    'tax problem resolution',
    'IRS debt relief',
    'tax settlement',
    'IRS payment plan',
    'tax lien removal',
    'IRS levy release',
    'back taxes help',
  ],
  url: '/irs-resolution',
});

export const servicesMetadata: Metadata = generateMetadata({
  title: 'Tax Services - Personal, Business, Planning & Resolution',
  description:
    'Comprehensive tax services including personal tax filing, business tax preparation, tax planning, audit protection, and IRS resolution. Expert certified tax professionals nationwide.',
  keywords: [
    'tax services',
    'professional tax services',
    'comprehensive tax help',
    'full service tax preparation',
    'tax professional services',
    'complete tax solutions',
    'tax expert services',
    'all tax services',
  ],
  url: '/services',
});
