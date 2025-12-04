'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';

export function FAQSection() {
  const t = useTranslations('home.faq');

  const faqs = [
    { questionKey: 'faq1.question', answerKey: 'faq1.answer' },
    { questionKey: 'faq2.question', answerKey: 'faq2.answer' },
    { questionKey: 'faq3.question', answerKey: 'faq3.answer' },
    { questionKey: 'faq4.question', answerKey: 'faq4.answer' },
    { questionKey: 'faq5.question', answerKey: 'faq5.answer' },
  ];
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-12">
            {t('sectionTitle')}
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index + 1}`}
                className="bg-card rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent>{t(faq.answerKey)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
