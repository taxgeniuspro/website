import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Simple rate limiting using in-memory store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// GET: Check application status by email (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find the most recent application for this email
    const application = await prisma.preparerApplication.findFirst({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        // Do NOT expose: notes, interviewNotes, rejectionReason (admin-only)
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'No application found for this email address' },
        { status: 404 }
      );
    }

    // Calculate stage progress
    const stages = ['NEW', 'CONTACTED', 'INTERVIEWED', 'DECISION'];
    const currentStageIndex = stages.indexOf(application.stage);

    // Determine next steps based on status and stage
    let nextSteps: string;
    if (application.status === 'APPROVED') {
      nextSteps = 'Congratulations! Your application has been approved. Check your email for login instructions.';
    } else if (application.status === 'REJECTED') {
      nextSteps = 'Thank you for your interest. Unfortunately, we are unable to move forward at this time. Check your email for more details.';
    } else {
      // PENDING status - show based on stage
      const stageMessages: Record<string, string> = {
        NEW: 'Your application is being reviewed by our hiring team. You should hear from us within 1-2 business days.',
        CONTACTED: 'Our team has reached out to you. Please check your email and phone for messages from Tax Genius Pro.',
        INTERVIEWED: 'Thank you for completing your interview! We are reviewing your information and will be in touch soon.',
        DECISION: 'Your application is in final review. A decision will be made shortly.',
      };
      nextSteps = stageMessages[application.stage] || stageMessages.NEW;
    }

    logger.info('Application status checked', {
      applicationId: application.id,
      email: email.toLowerCase(),
      status: application.status,
      stage: application.stage,
    });

    return NextResponse.json({
      application: {
        id: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        status: application.status,
        stage: application.stage,
        stageIndex: currentStageIndex,
        totalStages: stages.length,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      nextSteps,
      stages,
    });
  } catch (error) {
    logger.error('Error checking application status:', error);
    return NextResponse.json(
      { error: 'Failed to check application status' },
      { status: 500 }
    );
  }
}
