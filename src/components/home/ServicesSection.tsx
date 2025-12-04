'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function ServicesSection() {
  const t = useTranslations('home.services');

  const services = [
    {
      titleKey: 'personal.title',
      descriptionKey: 'personal.description',
      badgeKey: 'personal.badge',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
      badgeClass: 'bg-primary text-primary-foreground',
      link: '/services/personal',
      delay: 0,
    },
    {
      titleKey: 'business.title',
      descriptionKey: 'business.description',
      badgeKey: 'business.badge',
      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80',
      badgeClass: 'bg-blue-600 text-white',
      link: '/services/business',
      delay: 0.2,
    },
    {
      titleKey: 'planning.title',
      descriptionKey: 'planning.description',
      badgeKey: 'planning.badge',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
      badgeClass: 'bg-purple-600 text-white',
      link: '/services/planning',
      delay: 0.4,
    },
  ];
  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('sectionTitle')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('sectionSubtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.titleKey}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: service.delay }}
              whileHover={{ y: -10 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 group overflow-hidden h-full cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={service.image}
                    alt={t(service.titleKey)}
                    width={600}
                    height={400}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                    <Badge className={service.badgeClass}>{t(service.badgeKey)}</Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{t(service.titleKey)}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {t(service.descriptionKey)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={service.link}>{t('learnMore')}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Services Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12 space-y-6"
        >
          <p className="text-muted-foreground">
            {t('supportNote')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="professional" asChild>
              <Link href="/start-filing/form">{t('ctaFileOnline')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/services">{t('ctaViewAll')}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
