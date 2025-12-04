import DOMPurify from 'isomorphic-dompurify';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LandingPageData {
  headline: string;
  bodyContent: string;
  qaAccordion: Array<{ question: string; answer: string }>;
  city: string;
}

interface LandingPageTemplateProps {
  data: LandingPageData;
}

/**
 * Landing Page Template Component (AC14-17)
 * Reusable template for all city landing pages
 *
 * Security: Content sanitized with DOMPurify (AC23 - MANDATORY)
 * Design: Uses existing Tailwind + shadcn/ui design system (AC16)
 * Responsive: Mobile-first design (AC17)
 */
export function LandingPageTemplate({ data }: LandingPageTemplateProps) {
  // MANDATORY: Sanitize body content before rendering (AC23)
  // Defense-in-depth: Content already sanitized at generation, but sanitize again before render
  const sanitizedBody = DOMPurify.sanitize(data.bodyContent, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'h2', 'h3'],
    ALLOWED_ATTR: [],
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section (AC15) */}
      <section className="bg-primary py-12 md:py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 md:mb-8">
            {data.headline}
          </h1>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/signup">Get Started - It&apos;s Free</Link>
          </Button>
        </div>
      </section>

      {/* Body Content Section (AC15, AC23) */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div
            className="prose prose-lg max-w-none
              prose-headings:text-foreground 
              prose-p:text-muted-foreground
              prose-strong:text-foreground
              prose-ul:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        </div>
      </section>

      {/* Q&A Accordion Section (AC15) */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {data.qaAccordion.map((qa, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left">{qa.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{qa.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Footer Section (AC15) */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
            Ready to file your taxes stress-free in {data.city}?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/auth/signup">Create Free Account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/refer">Become a Referrer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
