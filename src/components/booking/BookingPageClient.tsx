'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import AppointmentBooking from '@/components/AppointmentBooking';
import { User, Phone, Video, FileText } from 'lucide-react';

interface Preparer {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

interface BookingPageClientProps {
  preparer: Preparer | null;
}

export function BookingPageClient({ preparer }: BookingPageClientProps) {
  const t = useTranslations('booking');
  const preparerName = preparer
    ? `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || t('preparer.yourTaxProfessional')
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-muted/30 py-12 px-4"
      >
        <div className="container mx-auto max-w-6xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl lg:text-6xl font-bold mb-4"
          >
            {t('header.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground"
          >
            {t('header.subtitle')}
          </motion.p>
        </div>
      </motion.section>

      {/* Main Content - Two Column Layout */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="py-16 px-4"
      >
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Preparer Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8"
            >
              {preparer ? (
                <div className="sticky top-8">
                  <div className="bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                    {/* Profile Picture with Decorative Background */}
                    <div className="relative bg-muted/30 pt-12 pb-8 px-8">
                      <div className="flex justify-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                          className="relative"
                        >
                          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-xl ring-4 ring-primary/10">
                            {preparer.avatarUrl ? (
                              <Image
                                src={preparer.avatarUrl}
                                alt={preparerName || 'Tax Professional'}
                                fill
                                className="object-cover"
                                priority
                                quality={100}
                                sizes="(max-width: 768px) 128px, 128px"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary flex items-center justify-center">
                                <User className="w-16 h-16 text-primary-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Verified Badge */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.7 }}
                            className="absolute bottom-0 right-0 bg-secondary rounded-full p-2 border-3 border-background shadow-lg"
                          >
                            <svg
                              className="w-5 h-5 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* Name and Title */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="text-center mt-6 pb-8"
                      >
                        <h2 className="text-2xl font-bold mb-1">{preparerName}</h2>
                        <p className="text-base text-muted-foreground font-medium">
                          {t('preparer.licensedTaxProfessional')}
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <User className="w-24 h-24 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-2xl font-bold mb-2">{t('preparer.expertTaxProfessionals')}</h3>
                  <p className="text-muted-foreground">
                    {t('preparer.scheduleWithCPAs')}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Right Side - Booking Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <AppointmentBooking />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="py-16 px-4 bg-muted/30"
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('features.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-col items-center text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-3">{t('features.consultation.title')}</h3>
              <p className="text-muted-foreground">
                {t('features.consultation.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex flex-col items-center text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3">{t('features.cpaReview.title')}</h3>
              <p className="text-muted-foreground">
                {t('features.cpaReview.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex flex-col items-center text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-3">{t('features.strategy.title')}</h3>
              <p className="text-muted-foreground">
                {t('features.strategy.description')}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Oliver Logo Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="py-16 px-4"
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex items-center justify-center"
          >
            <Image
              src="/icon-512x512.png"
              alt={t('imageAlt')}
              width={180}
              height={180}
              className="object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
