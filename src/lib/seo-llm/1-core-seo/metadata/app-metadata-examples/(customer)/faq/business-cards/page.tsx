/**
 * Business Card FAQ Page
 *
 * SEO-optimized FAQ page with schema markup
 * AI bots (ChatGPT, Claude, Perplexity) will index this content
 */

import type { Metadata } from 'next'
import { FAQPage } from '@/components/seo/FAQSchema'
import { businessCardFAQs } from '@/data/faqs/business-cards'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Business Card Printing FAQ - Common Questions Answered | GangRun Printing',
  description:
    'Find answers to common questions about business card printing: sizes, paper options, turnaround times, file requirements, and more. Expert guidance from GangRun Printing.',
  keywords:
    'business card FAQ, business card printing questions, business card sizes, business card paper weight, business card turnaround time',
  openGraph: {
    title: 'Business Card Printing FAQ | GangRun Printing',
    description:
      'Get answers to your business card printing questions. Learn about sizes, paper options, turnaround times, and more.',
    type: 'website',
  },
}

export default function BusinessCardFAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="text-sm text-gray-600">
            <Link className="hover:text-gray-900" href="/">
              Home
            </Link>
            {' / '}
            <Link className="hover:text-gray-900" href="/faq">
              FAQ
            </Link>
            {' / '}
            <span className="text-gray-900 font-medium">Business Cards</span>
          </nav>
        </div>
      </div>

      {/* FAQ Content */}
      <FAQPage
        showCategory
        description="Everything you need to know about printing professional business cards with GangRun Printing."
        faqs={businessCardFAQs}
        title="Business Card Printing FAQ"
      />

      {/* CTA Section */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Print Your Business Cards?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Get professional business cards printed with fast turnaround and competitive pricing.
            Upload your design or use our free templates to get started.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              href="/products/business-cards"
            >
              Order Business Cards
            </Link>
            <Link
              className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              href="/contact"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      {/* Related FAQs */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Related FAQ Pages</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            className="p-6 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            href="/faq/flyers"
          >
            <h4 className="font-semibold text-gray-900 mb-2">Flyer Printing FAQ</h4>
            <p className="text-sm text-gray-600">
              Common questions about flyer sizes, paper options, and turnaround times
            </p>
          </Link>
          <Link
            className="p-6 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            href="/faq"
          >
            <h4 className="font-semibold text-gray-900 mb-2">General Printing FAQ</h4>
            <p className="text-sm text-gray-600">
              Answers to common questions about our printing services and processes
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
