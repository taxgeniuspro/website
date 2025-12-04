/**
 * FAQ Data for Service Pages
 * Used for both UI and FAQ Schema generation
 */

import { FAQ } from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';

export const personalTaxFAQs: FAQ[] = [
  {
    question: 'How much does personal tax filing cost?',
    answer:
      'Our personal tax filing starts at $149 for simple W-2 returns, $249 for standard returns with itemized deductions, and $399+ for complex returns with investments or rental property. All plans include audit protection.',
  },
  {
    question: 'What documents do I need for personal tax filing?',
    answer:
      "You'll need your W-2s, 1099s (for interest, dividends, or freelance income), receipts for deductible expenses, last year's tax return, and information about any life changes like marriage, home purchase, or having children.",
  },
  {
    question: 'Can I claim the standard deduction or should I itemize?',
    answer:
      'Our CPAs will analyze your situation to determine which gives you the best outcome. Generally, itemizing is better if your deductible expenses (mortgage interest, property taxes, charitable donations, medical expenses) exceed the standard deduction ($13,850 for single filers, $27,700 for married filing jointly in 2023).',
  },
  {
    question: 'How long does it take to file my personal taxes?',
    answer:
      'Most simple returns are completed within 24-48 hours. Complex returns may take 3-5 business days. Once filed, you can typically expect your refund in 21 days with direct deposit, or 4-6 weeks with a paper check.',
  },
  {
    question: "What if I made a mistake on last year's return?",
    answer:
      'We can help you file an amended return (Form 1040-X) to correct errors from previous years. You generally have 3 years from the original due date to file an amended return and claim a refund.',
  },
];

export const businessTaxFAQs: FAQ[] = [
  {
    question: 'What business structures do you handle?',
    answer:
      'We handle all business structures including sole proprietorships (Schedule C), partnerships (Form 1065), S-Corporations (Form 1120-S), C-Corporations (Form 1120), and LLCs taxed as any of these entities.',
  },
  {
    question: 'When are business tax returns due?',
    answer:
      'It depends on your business structure: Sole proprietorships file with your personal return (April 15), Partnerships and S-Corps are due March 15, and C-Corps are due April 15. We help you file extensions if needed.',
  },
  {
    question: 'Can you help with quarterly estimated taxes?',
    answer:
      'Yes! We calculate your quarterly estimated tax payments and send you reminders before each deadline (April 15, June 15, September 15, and January 15). This helps you avoid penalties and manage cash flow.',
  },
  {
    question: 'What deductions can my business claim?',
    answer:
      'Common business deductions include office expenses, equipment purchases, vehicle use, home office, employee wages, health insurance, retirement contributions, professional services, marketing costs, and business travel. We help you maximize legitimate deductions while staying compliant.',
  },
  {
    question: 'Do I need separate bookkeeping services?',
    answer:
      'While we can file your taxes from existing books, we recommend professional bookkeeping for accuracy. We can review your QuickBooks or recommend bookkeeping partners. Clean books make tax filing faster and more accurate.',
  },
];

export const taxPlanningFAQs: FAQ[] = [
  {
    question: 'What is tax planning and why do I need it?',
    answer:
      'Tax planning is proactive strategy to minimize your tax liability legally. Unlike tax preparation (which looks backward at last year), tax planning looks forward to help you make smart financial decisions throughout the year that reduce your taxes.',
  },
  {
    question: 'When should I start tax planning?',
    answer:
      'The best time to start is NOW! Tax planning is most effective when done throughout the year, not in December. Early planning gives you time to implement strategies like retirement contributions, business structure changes, or investment timing.',
  },
  {
    question: 'How much can I save with tax planning?',
    answer:
      'Savings vary based on your income and situation, but our clients typically save $5,000-$50,000+ annually. High-income earners and business owners see the biggest benefits. Our tax planning services often pay for themselves many times over.',
  },
  {
    question: 'What strategies do you recommend?',
    answer:
      'Common strategies include maximizing retirement contributions, timing income and deductions, choosing the right business structure, setting up health savings accounts, tax-loss harvesting for investments, charitable giving strategies, and estate planning. We customize recommendations to your situation.',
  },
  {
    question: 'Is tax planning only for wealthy people?',
    answer:
      'No! While high-earners benefit greatly, anyone with income over $75,000, business owners, real estate investors, or those with investment income can benefit from tax planning. Even small optimizations add up over time.',
  },
];

export const auditProtectionFAQs: FAQ[] = [
  {
    question: 'What does audit protection include?',
    answer:
      'Our audit protection includes full IRS representation, handling all communications with the IRS, reviewing notices, gathering documentation, representing you at IRS meetings, and negotiating on your behalf. You never have to speak directly to the IRS.',
  },
  {
    question: 'How likely am I to be audited?',
    answer:
      'The overall audit rate is less than 1% for most taxpayers. However, rates are higher for high-income earners (3-10%), business owners, and those claiming certain deductions. Our accurate preparation reduces your audit risk significantly.',
  },
  {
    question: 'What happens if I get audited?',
    answer:
      "If you receive an audit notice, contact us immediately. We'll review the notice, gather necessary documents, prepare your response, and handle all IRS communications. Most audits are resolved through mail correspondence without in-person meetings.",
  },
  {
    question: 'Does audit protection cover state audits too?',
    answer:
      'Yes! Our audit protection covers both federal (IRS) and state tax audits. State audits are less common but our protection applies to any tax return we prepared.',
  },
  {
    question: 'Is there a time limit on audit protection?',
    answer:
      'Our audit protection covers you for the full statute of limitations period (typically 3 years from filing). If you become a client for ongoing tax preparation, your protection continues year after year.',
  },
];

export const irsResolutionFAQs: FAQ[] = [
  {
    question: 'What types of IRS problems can you resolve?',
    answer:
      'We handle back taxes owed, unfiled returns, wage garnishments, bank levies, tax liens, payment plans (installment agreements), Offer in Compromise (settling for less), penalty abatement, innocent spouse relief, and audit representation.',
  },
  {
    question: 'How long does IRS resolution take?',
    answer:
      'Timeline varies by case complexity. Simple payment plans can be set up in 1-2 weeks. Offer in Compromise cases take 6-12 months. Complex cases with multiple issues may take longer. We prioritize stopping collection actions like garnishments immediately.',
  },
  {
    question: 'Can you really settle my tax debt for less than I owe?',
    answer:
      "In some cases, yes. The IRS Offer in Compromise program allows qualifying taxpayers to settle for less based on their ability to pay. Not everyone qualifies, but we'll evaluate your situation and pursue all options to minimize what you owe.",
  },
  {
    question: "What if I can't afford to pay anything right now?",
    answer:
      'The IRS has hardship programs. We can request Currently Not Collectible status, which temporarily pauses collection while you get back on your feet. We can also negotiate affordable payment plans as low as $25-50/month.',
  },
  {
    question: 'Will you stop the IRS from garnishing my wages?',
    answer:
      'Yes! Stopping wage garnishments and bank levies is often our first priority. We immediately contact the IRS to request release of levies while we negotiate a resolution. In most cases, we can stop garnishments within 1-2 weeks.',
  },
];

export const servicesOverviewFAQs: FAQ[] = [
  {
    question: 'How do I know which service I need?',
    answer:
      "Schedule a free consultation with our CPAs. We'll discuss your situation and recommend the right services. Most clients need basic tax preparation, but business owners, high-earners, or those with tax problems benefit from our specialized services.",
  },
  {
    question: 'Can I combine multiple services?',
    answer:
      'Absolutely! Many clients use both tax preparation and tax planning. Business owners often combine business tax filing with quarterly planning. We offer bundled packages that save you money on multiple services.',
  },
  {
    question: 'Do you offer year-round support?',
    answer:
      "Yes! Unlike seasonal tax shops, we're here year-round. Tax planning clients get quarterly check-ins. All clients can reach us anytime with tax questions, IRS notices, or life changes that affect taxes.",
  },
  {
    question: 'Are your CPAs experienced?',
    answer:
      'Our team includes licensed CPAs, Enrolled Agents (EAs), and tax attorneys with 10-30+ years experience. Every return is reviewed by a senior tax professional. We handle simple to complex tax situations with expertise.',
  },
  {
    question: 'What makes you different from other tax firms?',
    answer:
      'We combine technology with expert human service. Our secure online platform makes filing convenient, while our CPAs provide personalized strategy. We offer transparent pricing, guaranteed accuracy, year-round support, and included audit protection.',
  },
];
