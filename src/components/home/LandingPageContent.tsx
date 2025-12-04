'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustLogosBar } from '@/components/home/TrustLogosBar';
import { ServicesSection } from '@/components/home/ServicesSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { WhyChooseUsSection } from '@/components/home/WhyChooseUsSection';
import { CredentialsSection } from '@/components/home/CredentialsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { FAQSection } from '@/components/home/FAQSection';
import { FinalCTASection } from '@/components/home/FinalCTASection';
import { OpportunitiesSection } from '@/components/home/OpportunitiesSection';
import { MobileHubRedirect } from '@/components/MobileHubRedirect';
import {
  generateTaxGeniusOrganizationSchema,
  generateTaxGeniusFAQSchema,
} from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';

// FAQ data for schema
const faqData = [
  {
    question: 'How quickly can I get my refund?',
    answer:
      'With direct deposit, you can receive your federal refund in as little as 24 hours after IRS acceptance. Paper checks typically take 2-3 weeks.',
  },
  {
    question: 'What documents do I need to file?',
    answer:
      "You'll need your W-2s, 1099s, receipts for deductions, last year's tax return, and any other income or deduction documents. Our platform will guide you through everything you need.",
  },
  {
    question: 'Is my information secure?',
    answer:
      'Yes! We use bank-level 256-bit encryption and are IRS-authorized. Your data is protected with the same security standards used by major financial institutions.',
  },
  {
    question: 'What if I need help during filing?',
    answer:
      'Our CPAs are available via chat, phone, or video call. Premium plans include unlimited CPA support throughout the filing process.',
  },
  {
    question: 'Do you offer audit protection?',
    answer:
      "Yes! All our plans include free audit protection. If you're audited, we'll represent you and handle all IRS communications at no extra cost.",
  },
];

export function LandingPageContent() {
  const organizationSchema = generateTaxGeniusOrganizationSchema();
  const faqSchema = generateTaxGeniusFAQSchema(faqData);

  return (
    <div className="min-h-screen bg-background">
      {/* Organization Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* FAQ Schema for SEO */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Auto-redirect mobile users to mobile hub if logged in */}
      <MobileHubRedirect />

      <Header />

      <HeroSection />
      <TrustLogosBar />
      <ServicesSection />
      <HowItWorksSection />
      <WhyChooseUsSection />
      <CredentialsSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />
      <OpportunitiesSection />

      {/* Floating Chat Widget */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 group">
        <Button
          size="lg"
          className="rounded-full w-12 h-12 md:w-14 md:h-14 shadow-xl bg-primary hover:bg-primary/90 group-hover:scale-110 transition-transform"
          aria-label="Open live chat support"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-card text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Need help? Chat with us!
        </span>
      </div>
    </div>
  );
}
