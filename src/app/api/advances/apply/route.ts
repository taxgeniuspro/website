import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Application schema validation
const applicationSchema = z.object({
  // Personal Info
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  ssn: z.string().min(9),
  dob: z.string(),
  phone: z.string(),
  email: z.string().email(),

  // Income Info
  employmentType: z.enum(['gig', 'w2', '1099', 'both']),
  employer: z.string(),
  annualIncome: z.number().min(10000).max(500000),
  lastYearIncome: z.number().min(0),
  hasW2: z.boolean(),
  has1099: z.boolean(),

  // Advance Details
  requestedAmount: z.number().min(500).max(7000),
  estimatedRefund: z.number().min(0),
  bankAccount: z.string().length(4),
  routingNumber: z.string().min(9),
});

// Simulated risk assessment
function calculateRiskScore(data: any): {
  score: number;
  approved: boolean;
  approvedAmount: number;
  factors: string[];
} {
  let score = 50; // Base score
  const factors: string[] = [];

  // Income verification
  if (data.annualIncome > 25000) {
    score += 10;
  } else {
    factors.push('Low income');
  }

  // Document verification
  if (data.hasW2 || data.has1099) {
    score += 15;
  } else {
    factors.push('Missing tax documents');
  }

  // Income consistency
  const incomeChange = Math.abs(data.annualIncome - data.lastYearIncome) / data.lastYearIncome;
  if (incomeChange < 0.3) {
    score += 10;
  } else {
    factors.push('Inconsistent income');
  }

  // Employment type
  if (data.employmentType === 'w2' || data.employmentType === 'both') {
    score += 10;
  }

  // Requested amount vs estimated refund
  const requestRatio = data.requestedAmount / data.estimatedRefund;
  if (requestRatio <= 0.8) {
    score += 15;
  } else if (requestRatio > 1) {
    factors.push('Request exceeds estimated refund');
    score -= 20;
  }

  // Calculate approval
  const approved = score >= 60;
  const maxApproved = Math.min(data.requestedAmount, data.estimatedRefund * 0.8, 7000);
  const approvedAmount = approved ? maxApproved : 0;

  return {
    score,
    approved,
    approvedAmount,
    factors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = applicationSchema.parse(body);

    // Calculate risk score
    const riskAssessment = calculateRiskScore(validatedData);

    // Simulate database save (in production, save to database)
    const applicationId = crypto.randomUUID();

    // Prepare response
    const response = {
      id: applicationId,
      status: riskAssessment.approved ? 'approved' : 'declined',
      amount: riskAssessment.approvedAmount,
      requestedAmount: validatedData.requestedAmount,
      estimatedRefund: validatedData.estimatedRefund,
      riskScore: riskAssessment.score,
      factors: riskAssessment.factors,
      message: riskAssessment.approved
        ? `Congratulations! You're approved for $${riskAssessment.approvedAmount.toLocaleString()}`
        : 'Your application requires additional review. A specialist will contact you within 24 hours.',
      nextSteps: riskAssessment.approved
        ? [
            'Funds will be deposited within 10 minutes',
            'Check your email for confirmation',
            'Download our app to track your advance',
          ]
        : [
            'Upload additional documents if available',
            'A specialist will review your application',
            'You will receive a decision within 24 hours',
          ],
    };

    // Log application (in production, use proper logging)
    logger.info('Advance application processed:', {
      id: applicationId,
      email: validatedData.email,
      amount: validatedData.requestedAmount,
      approved: riskAssessment.approved,
    });

    // Return response
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid application data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Application processing error:', error);
    return NextResponse.json({ error: 'Failed to process application' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Get application status
  const searchParams = request.nextUrl.searchParams;
  const applicationId = searchParams.get('id');

  if (!applicationId) {
    return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
  }

  // Simulate database lookup (in production, query database)
  const mockApplication = {
    id: applicationId,
    status: 'approved',
    amount: 2500,
    fundedAt: new Date().toISOString(),
    repaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return NextResponse.json(mockApplication, { status: 200 });
}
