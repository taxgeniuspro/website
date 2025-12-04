/**
 * Flyer Printing FAQ Page
 *
 * SEO-optimized FAQ page with schema markup
 */

import type { Metadata } from 'next'
import { FAQPage } from '@/components/seo/FAQSchema'
import { flyerFAQs } from '@/data/faqs/flyers'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Flyer Printing FAQ - Common Questions Answered | GangRun Printing',
  description:
    'Find answers to common questions about flyer printing: sizes, paper weight, turnaround times, file formats, and more. Expert advice from GangRun Printing.',
  keywords:
    'flyer printing FAQ, flyer sizes, flyer paper weight, flyer turnaround time, promotional flyer printing',
}

export default function FlyerFAQPage() {
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
            <span className="text-gray-900 font-medium">Flyers</span>
          </nav>
        </div>
      </div>

      {/* FAQ Content */}
      <FAQPage
        showCategory
        description="Common questions about printing promotional flyers, marketing materials, and event programs."
        faqs={flyerFAQs}
        title="Flyer Printing FAQ"
      />

      {/* CTA Section */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Print Your Flyers?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Get high-quality flyers printed fast with competitive pricing. Perfect for promotions,
            events, and marketing campaigns.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              href="/products/flyers"
            >
              Order Flyers
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
            href="/faq/business-cards"
          >
            <h4 className="font-semibold text-gray-900 mb-2">Business Card FAQ</h4>
            <p className="text-sm text-gray-600">
              Everything you need to know about business card printing
            </p>
          </Link>
          <Link
            className="p-6 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            href="/faq"
          >
            <h4 className="font-semibold text-gray-900 mb-2">General Printing FAQ</h4>
            <p className="text-sm text-gray-600">Common questions about our printing services</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
