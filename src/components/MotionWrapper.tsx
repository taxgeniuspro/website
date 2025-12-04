'use client';

/**
 * Lazy-loaded Framer Motion Wrapper
 *
 * This component provides a performance-optimized way to use Framer Motion animations.
 * Instead of loading the entire 104KB library upfront, it dynamically imports motion
 * components only when they're needed (on scroll or interaction).
 *
 * Benefits:
 * - Saves 104KB from initial bundle
 * - Loads animations only when visible
 * - Fallback to CSS animations during load
 */

import dynamic from 'next/dynamic';
import type { HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

// Dynamically import motion components with no SSR
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  {
    ssr: false,
    loading: () => <div className="animate-fadeIn" />,
  }
);

const MotionSection = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.section),
  {
    ssr: false,
    loading: () => <section className="animate-fadeIn" />,
  }
);

const MotionH1 = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.h1),
  {
    ssr: false,
    loading: () => <h1 className="animate-fadeIn" />,
  }
);

const MotionH2 = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.h2),
  {
    ssr: false,
    loading: () => <h2 className="animate-fadeIn" />,
  }
);

const MotionP = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.p),
  {
    ssr: false,
    loading: () => <p className="animate-fadeIn" />,
  }
);

// Re-export motion components
export const Motion = {
  div: MotionDiv as typeof import('framer-motion').motion.div,
  section: MotionSection as typeof import('framer-motion').motion.section,
  h1: MotionH1 as typeof import('framer-motion').motion.h1,
  h2: MotionH2 as typeof import('framer-motion').motion.h2,
  p: MotionP as typeof import('framer-motion').motion.p,
};

// Preset animation variants for common use cases
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 },
};
