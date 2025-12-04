'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Search,
  HelpCircle,
  Package,
  Truck,
  CreditCard,
  Upload,
  MessageSquare,
  Phone,
  Mail,
} from 'lucide-react'

const faqs = [
  {
    category: 'Ordering',
    icon: Package,
    questions: [
      {
        q: 'How do I place an order?',
        a: 'Simply browse our products, select your specifications, upload your design, and proceed to checkout. You can also request a custom quote for special requirements.',
      },
      {
        q: 'What file formats do you accept?',
        a: 'We accept PDF, AI, PSD, JPG, and PNG files. For best results, we recommend PDF files with 300 DPI resolution.',
      },
      {
        q: 'Can I order samples?',
        a: 'Yes! We offer sample packs for most of our products. Visit our Free Samples page to request yours.',
      },
      {
        q: 'What is your minimum order quantity?',
        a: 'Minimum quantities vary by product. Business cards start at 100, flyers at 25, and custom items may have different minimums.',
      },
    ],
  },
  {
    category: 'Shipping & Delivery',
    icon: Truck,
    questions: [
      {
        q: 'How long does shipping take?',
        a: 'Standard shipping takes 3-5 business days. Rush options are available for 24-hour and 48-hour delivery.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, we ship worldwide. International shipping times and rates vary by location.',
      },
      {
        q: 'How can I track my order?',
        a: "Once your order ships, you'll receive a tracking number via email. You can also track your order on our website.",
      },
      {
        q: 'What are your shipping costs?',
        a: 'Shipping costs depend on order size and delivery speed. Free shipping is available on orders over $100.',
      },
    ],
  },
  {
    category: 'Design & Files',
    icon: Upload,
    questions: [
      {
        q: 'Do you offer design services?',
        a: 'Yes! Our professional design team can help create custom designs for your printing needs. Contact us for pricing.',
      },
      {
        q: 'What resolution should my files be?',
        a: 'Files should be at least 300 DPI for optimal print quality. Lower resolutions may result in pixelated prints.',
      },
      {
        q: 'Can you match specific colors?',
        a: 'We use CMYK printing and can match most colors. For exact color matching, please provide Pantone color codes.',
      },
      {
        q: 'How do I prepare files for printing?',
        a: 'Ensure your files are in CMYK color mode, include 0.125" bleed, and embed all fonts. Our templates can help.',
      },
    ],
  },
  {
    category: 'Payment & Pricing',
    icon: CreditCard,
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, debit cards, and PayPal through our secure Square payment system.',
      },
      {
        q: 'Do you offer bulk discounts?',
        a: 'Yes! The more you order, the more you save. Bulk pricing is automatically applied in your cart.',
      },
      {
        q: 'Can I get a custom quote?',
        a: 'Absolutely! For special projects or large orders, request a custom quote through our contact form.',
      },
      {
        q: 'Is payment secure?',
        a: "Yes, all payments are processed through Square's secure, PCI-compliant payment system.",
      },
    ],
  },
]

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredFaqs = selectedCategory
    ? faqs.filter((cat) => cat.category === selectedCategory)
    : faqs

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="bg-primary/5 border-b py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find answers to common questions or contact our support team
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 h-12 text-lg"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {faqs.map((category) => {
                const Icon = category.icon
                return (
                  <Card
                    key={category.category}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category.category ? null : category.category
                      )
                    }
                  >
                    <CardContent className="p-6 text-center">
                      <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold">{category.category}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.questions.length} articles
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">
              {selectedCategory ? `${selectedCategory} Questions` : 'Frequently Asked Questions'}
            </h2>

            {filteredFaqs.map((category) => (
              <div key={category.category} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-primary" />
                  {category.category}
                </h3>
                <Accordion collapsible className="space-y-2" type="single">
                  {category.questions.map((faq, index) => (
                    <AccordionItem key={index} value={`${category.category}-${index}`}>
                      <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-muted-foreground mb-8">Our support team is here to assist you</p>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Call Us</h3>
                  <p className="text-sm text-muted-foreground mb-3">Mon-Fri 9am-6pm CST</p>
                  <a className="text-primary hover:underline" href="tel:1-800-PRINTING">
                    1-800-PRINTING
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Email Us</h3>
                  <p className="text-sm text-muted-foreground mb-3">24/7 Support</p>
                  <a
                    className="text-primary hover:underline"
                    href="mailto:support@gangrunprinting.com"
                  >
                    support@gangrunprinting.com
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Live Chat</h3>
                  <p className="text-sm text-muted-foreground mb-3">Available 9am-6pm CST</p>
                  <Button size="sm">Start Chat</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
