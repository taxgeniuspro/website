import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

export class CustomAPIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'CustomAPIError';
  }
}

export function createAPIError(
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: unknown
): CustomAPIError {
  return new CustomAPIError(message, statusCode, code, details);
}

export function handleAPIError(error: unknown): NextResponse {
  logger.error('API Error:', error);

  // Handle custom API errors
  if (error instanceof CustomAPIError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_ENTRY',
              message: 'A record with this information already exists',
              details: { constraint: error.meta?.target },
            },
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'The requested resource was not found',
              details: { cause: error.meta?.cause },
            },
          },
          { status: 404 }
        );
      case 'P2003':
        return NextResponse.json(
          {
            error: {
              code: 'FOREIGN_KEY_CONSTRAINT',
              message: 'Referenced record does not exist',
              details: { field: error.meta?.field_name },
            },
          },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Database operation failed',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            },
          },
          { status: 500 }
        );
    }
  }

  // Handle Prisma connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error: {
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Unable to connect to database',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      },
      { status: 503 }
    );
  }

  // Handle authentication/authorization errors
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    if (error.message === 'Insufficient permissions') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to access this resource',
          },
        },
        { status: 403 }
      );
    }
  }

  // Default fallback for unknown errors
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? { message: error.message, stack: error.stack }
            : undefined,
      },
    },
    { status: 500 }
  );
}

// Wrapper function for API route handlers
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async function (request: NextRequest, context?: any): Promise<NextResponse> {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

// Rate limiting error
export function createRateLimitError(resetTime: number): CustomAPIError {
  return new CustomAPIError(
    'Too many requests. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED',
    { resetTime }
  );
}

// Service unavailable error (for maintenance, Redis down, etc.)
export function createServiceUnavailableError(service: string): CustomAPIError {
  return new CustomAPIError(
    `${service} is temporarily unavailable. Please try again later.`,
    503,
    'SERVICE_UNAVAILABLE',
    { service }
  );
}
