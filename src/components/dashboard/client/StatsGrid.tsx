'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color: string;
}

interface StatsGridProps {
  stats: StatCard[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    {stat.changeType === 'increase' && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                    {stat.changeType === 'decrease' && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={cn(
                        'text-xs',
                        stat.changeType === 'increase' && 'text-green-600',
                        stat.changeType === 'decrease' && 'text-red-600',
                        stat.changeType === 'neutral' && 'text-muted-foreground'
                      )}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={cn('p-2 rounded-lg bg-gradient-to-br', stat.color)}>
                  <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
