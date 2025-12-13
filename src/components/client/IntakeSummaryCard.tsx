'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, MapPin, Briefcase, Users, Calendar } from 'lucide-react';

interface IntakeSummaryProps {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  formData?: {
    filing_status?: string;
    employment_type?: string;
    occupation?: string;
    num_dependents?: number;
    date_of_birth?: string;
    [key: string]: unknown;
  } | null;
}

export function IntakeSummaryCard({ personalInfo, address, formData }: IntakeSummaryProps) {
  const formatFilingStatus = (status?: string) => {
    if (!status) return 'Not specified';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatEmploymentType = (type?: string) => {
    if (!type) return 'Not specified';
    const types: Record<string, string> = {
      w2: 'W-2 Employee',
      '1099': '1099 Contractor',
      self_employed: 'Self-Employed',
      both: 'W-2 & 1099',
      unemployed: 'Unemployed',
    };
    return types[type.toLowerCase()] || type;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Your Tax Intake
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Submitted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Info */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {personalInfo.firstName} {personalInfo.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{personalInfo.email}</p>
            <p className="text-sm text-muted-foreground">{personalInfo.phone}</p>
          </div>
        </div>

        {/* Address */}
        {address?.line1 && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="text-sm">
              <p>{address.line1}</p>
              {address.line2 && <p>{address.line2}</p>}
              <p>
                {address.city}, {address.state} {address.zipCode}
              </p>
            </div>
          </div>
        )}

        {/* Filing Status & Employment */}
        <div className="flex items-start gap-3">
          <Briefcase className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p>
              Filing Status:{' '}
              <span className="font-medium">{formatFilingStatus(formData?.filing_status)}</span>
            </p>
            <p>
              Employment:{' '}
              <span className="font-medium">{formatEmploymentType(formData?.employment_type)}</span>
            </p>
            {formData?.occupation && (
              <p>
                Occupation: <span className="font-medium">{formData.occupation}</span>
              </p>
            )}
          </div>
        </div>

        {/* Dependents */}
        {formData?.num_dependents && formData.num_dependents > 0 && (
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">{formData.num_dependents}</span> dependent
              {formData.num_dependents > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Date of Birth (masked for privacy) */}
        {formData?.date_of_birth && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <p className="text-sm">
              Date of Birth: <span className="font-medium">{formData.date_of_birth}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
