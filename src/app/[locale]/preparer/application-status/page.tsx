'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, XCircle, Mail, Phone, Loader2 } from 'lucide-react';

interface ApplicationStatus {
  id: string;
  firstName: string;
  lastName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  stage: string;
  stageIndex: number;
  totalStages: number;
  createdAt: string;
  updatedAt: string;
}

interface StatusResponse {
  application: ApplicationStatus;
  nextSteps: string;
  stages: string[];
}

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/preparer-application/status?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to check application status');
        setStatusData(null);
        return;
      }

      setStatusData(data);
    } catch {
      setError('Something went wrong. Please try again.');
      setStatusData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Not Selected</Badge>;
      default:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">In Review</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-12 w-12 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Clock className="h-12 w-12 text-yellow-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Check Your Application Status
          </h1>
          <p className="text-muted-foreground">
            Enter your email address to see the status of your Tax Preparer application
          </p>
        </div>

        {/* Email Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !email} className="bg-secondary hover:bg-secondary/90">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Status'
                )}
              </Button>
            </form>
            {error && (
              <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Status Display */}
        {statusData && (
          <div className="space-y-6">
            {/* Status Header */}
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  {getStatusIcon(statusData.application.status)}
                </div>
                <CardTitle className="text-2xl">
                  {statusData.application.firstName} {statusData.application.lastName}
                </CardTitle>
                <CardDescription>
                  Application submitted on {formatDate(statusData.application.createdAt)}
                </CardDescription>
                <div className="mt-4">
                  {getStatusBadge(statusData.application.status)}
                </div>
              </CardHeader>
            </Card>

            {/* Progress Timeline */}
            {statusData.application.status === 'PENDING' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

                    {/* Timeline items */}
                    <div className="space-y-6">
                      {statusData.stages.map((stage, index) => {
                        const isCompleted = index < statusData.application.stageIndex;
                        const isCurrent = index === statusData.application.stageIndex;
                        const stageLabels: Record<string, string> = {
                          NEW: 'Application Received',
                          CONTACTED: 'Initial Contact',
                          INTERVIEWED: 'Interview Completed',
                          DECISION: 'Final Review',
                        };

                        return (
                          <div key={stage} className="relative flex items-start gap-4">
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                              isCompleted
                                ? 'bg-green-600'
                                : isCurrent
                                  ? 'bg-yellow-500'
                                  : 'bg-muted'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              ) : isCurrent ? (
                                <Clock className="h-5 w-5 text-white" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <p className={`font-medium ${
                                isCompleted || isCurrent
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}>
                                {stageLabels[stage] || stage}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Current stage
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{statusData.nextSteps}</p>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-secondary/10 border-secondary/20">
              <CardHeader>
                <CardTitle className="text-lg">Questions?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about your application, feel free to reach out to us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="tel:+14046271015"
                    className="flex items-center gap-2 text-secondary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    +1 404-627-1015
                  </a>
                  <a
                    href="mailto:taxgenius.taxes@gmail.com"
                    className="flex items-center gap-2 text-secondary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    taxgenius.taxes@gmail.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
