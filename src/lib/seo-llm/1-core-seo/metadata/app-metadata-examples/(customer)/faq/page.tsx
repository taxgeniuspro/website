/**
 * Main FAQ Landing Page
 *
 * Central hub for all FAQ categories
 */

import type { Metadata } from 'next'
import { FAQPage } from '@/components/seo/FAQSchema'
import { generalFAQs } from '@/data/faqs/general'
import Link from 'next/link'
import { CreditCard, FileText, HelpCircle, Truck, Clock, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Printing FAQ - Frequently Asked Questions | GangRun Printing',
  description:
    'Find answers to common questions about our printing services, turnaround times, file requirements, shipping, and more. Expert guidance for all your printing needs.',
  keywords:
    'printing FAQ, gang run printing questions, print turnaround time, file requirements, printing help',
}

const faqCategories = [
  {
    title: 'Business Cards',
    description: 'Sizes, paper options, finishes, and design guidelines',
    href: '/faq/business-cards',
    icon: CreditCard,
    count: '12 questions',
  },
  {
    title: 'Flyers & Posters',
    description: 'Paper weights, sizes, folding options, and mailing',
    href: '/faq/flyers',
    icon: FileText,
    count: '10 questions',
  },
  {
    title: 'Order & Payment',
    description: 'Payment methods, bulk discounts, and reordering',
    href: '#payment',
    icon: CreditCard,
    count: 'Coming soon',
  },
  {
    title: 'Shipping & Delivery',
    description: 'Turnaround times, shipping options, and tracking',
    href: '#shipping',
    icon: Truck,
    count: 'Coming soon',
  },
  {
    title: 'File Requirements',
    description: 'Formats, resolution, bleed, and color modes',
    href: '#files',
    icon: CheckCircle,
    count: 'Coming soon',
  },
  {
    title: 'Production Time',
    description: 'Standard and rush turnaround options',
    href: '#turnaround',
    icon: Clock,
    count: 'Coming soon',
  },
]

export default function FAQIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How Can We Help You?</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Find answers to common questions about our printing services, file requirements, and
            more.
          </p>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse by Category</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faqCategories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.href}
                className="bg-white p-6 rounded-lg border hover:border-blue-500 hover:shadow-lg transition-all group"
                href={category.href}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    <span className="text-xs text-gray-500">{category.count}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* General FAQs */}
      <div className="bg-white py-12">
        <FAQPage
          showCategory
          description="Common questions about GangRun Printing services, processes, and policies."
          faqs={generalFAQs}
          title="General Printing Questions"
        />
      </div>

      {/* Still Have Questions CTA */}
      <div className="bg-gray-50 border-t">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our customer support team is here to help. Contact
            us and we'll get back to you within 24 hours.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              href="/contact"
            >
              Contact Support
            </Link>
            <Link
              className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              href="/help-center"
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
