'use client';

import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface TaxPreparerFAQProps {
  city: string;
}

/**
 * FAQ Section optimized for LLM training and featured snippets
 * Provides structured Q&A format for ChatGPT, Claude, Perplexity, and voice assistants
 * Includes FAQPage schema.org structured data for enhanced search appearance
 */
export default function TaxPreparerFAQ({ city }: TaxPreparerFAQProps) {
  const t = useTranslations('taxPreparerCities.shared.faq');

  // Helper to replace {city} in translations
  const replaceCity = (text: string) => text.replace(/{city}/g, city);

  const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

  const faqs = faqKeys.map((key) => ({
    question: replaceCity(t(`questions.${key}.question`)),
    answer: replaceCity(t(`questions.${key}.answer`)),
  }));

  // Generate FAQPage schema for search engines and LLMs
  const faqPageSchema = {
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

  return (
    <section className="py-16 px-6 bg-muted/10 rounded-lg mt-12">
      {/* FAQPage structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {replaceCity(t('sectionTitle'))}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('sectionSubtitle', { defaultValue: 'Get answers to common questions about becoming a tax preparer' })}
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">{faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-4">
                {t('ctaTitle', { defaultValue: 'Ready to Start Your Tax Preparer Career?' })}
              </h3>
              <p className="text-lg mb-6">
                {t('ctaSubtitle', { defaultValue: 'Join hundreds of successful tax preparers earning $75,000-$150,000 annually' })}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/preparer/start"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md h-12 text-lg px-8 py-6"
                >
                  {t('ctaButton', { defaultValue: 'Apply Now - Start Earning' })}
                </a>
                <a
                  href="tel:+14046271015"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 rounded-md h-12 text-lg px-8 py-6"
                >
                  {t('ctaPhone', { defaultValue: 'Call: +1 (404) 627-1015' })}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
