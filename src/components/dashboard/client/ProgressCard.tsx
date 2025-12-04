'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaxReturn {
  id: string;
  taxYear: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'FILED' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
  filedDate?: string;
  acceptedDate?: string;
  refundAmount?: number;
  oweAmount?: number;
  progress: number;
}

interface ProgressCardProps {
  taxReturn: TaxReturn;
}

const steps = [
  { label: 'Documents Uploaded', value: 25 },
  { label: 'Under Review', value: 50 },
  { label: 'Return Filed', value: 75 },
  { label: 'Accepted', value: 100 },
];

export function ProgressCard({ taxReturn }: ProgressCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tax Return Progress - {taxReturn.taxYear}</CardTitle>
            <Badge variant="outline">{taxReturn.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{taxReturn.progress}%</span>
            </div>
            <Progress value={taxReturn.progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const isComplete = taxReturn.progress >= step.value;
              const isActive =
                taxReturn.progress >= step.value - 25 && taxReturn.progress < step.value;

              return (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full border-2',
                      isComplete && 'bg-primary border-primary',
                      isActive && 'border-primary',
                      !isComplete && !isActive && 'border-muted-foreground'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <Circle
                        className={cn(
                          'h-3 w-3',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      isComplete && 'font-medium',
                      !isComplete && !isActive && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
