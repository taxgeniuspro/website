'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  generateTaxGeniusFAQSchema,
  FAQ,
} from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';

interface ServiceFAQSectionProps {
  faqs: FAQ[];
  title?: string;
}

export function ServiceFAQSection({
  faqs,
  title = 'Frequently Asked Questions',
}: ServiceFAQSectionProps) {
  const faqSchema = generateTaxGeniusFAQSchema(faqs);

  return (
    <section className="py-20 bg-muted/30">
      {/* FAQ Schema for SEO */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">{title}</h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index + 1}`}
                className="bg-card rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
