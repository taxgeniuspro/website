'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { TrendingUp } from 'lucide-react';

interface StatItemProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  trend?: number;
  delay?: number;
}

function StatItem({ value, label, prefix = '', suffix = '', trend, delay = 0 }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="relative"
    >
      <div className="bg-gradient-to-br from-card to-card/50 border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="relative z-10">
          <div className="text-4xl md:text-5xl font-black text-primary mb-2">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </div>

          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </div>

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.5 }}
              className="flex items-center gap-1 mt-2 text-green-600 dark:text-green-400 text-xs font-semibold"
            >
              <TrendingUp className="w-3 h-3" />
              <span>+{trend}% this week</span>
            </motion.div>
          )}
        </div>

        <motion.div
          className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
}

export default function LiveStats({ type }: { type: 'preparer' | 'affiliate' }) {
  const preparerStats = [
    { value: 537, label: 'Active Preparers', suffix: '+', trend: 23 },
    { value: 75000, label: 'Avg Annual Income', prefix: '$', trend: 15 },
    { value: 2100000, label: 'Total Paid Out', prefix: '$', suffix: '+', trend: 42 },
    { value: 4.9, label: 'Preparer Rating', suffix: '/5' },
  ];

  const affiliateStats = [
    { value: 1247, label: 'Active Affiliates', suffix: '+', trend: 34 },
    { value: 50, label: 'Per Referral', prefix: '$', suffix: '+' },
    { value: 523000, label: 'Paid This Month', prefix: '$', trend: 28 },
    { value: 4.8, label: 'Partner Rating', suffix: '/5' },
  ];

  const stats = type === 'preparer' ? preparerStats : affiliateStats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <StatItem key={stat.label} {...stat} delay={index * 0.1} />
      ))}
    </div>
  );
}
