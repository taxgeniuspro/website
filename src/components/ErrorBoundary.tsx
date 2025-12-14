'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  hydrationRetried?: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, hydrationRetried: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a hydration error (caused by browser extensions like Google Translate)
    const isHydrationError =
      error.message.includes('removeChild') ||
      error.message.includes('insertBefore') ||
      error.message.includes('Hydration') ||
      error.message.includes('hydration') ||
      error.message.includes('Text content does not match');

    // For hydration errors, try to recover by forcing a client-side re-render
    if (isHydrationError && !this.state.hydrationRetried) {
      logger.warn('Hydration error detected, attempting recovery...', {
        error: error.message,
      });

      // Reset the error state after a brief delay to allow DOM to stabilize
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          hydrationRetried: true
        });
      }, 100);
      return;
    }

    logger.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add error reporting service (Sentry, LogRocket, etc.)
      logger.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
      }

      // Check if this is a hydration error
      const isHydrationError = this.state.error && (
        this.state.error.message.includes('removeChild') ||
        this.state.error.message.includes('insertBefore') ||
        this.state.error.message.includes('Hydration') ||
        this.state.error.message.includes('hydration')
      );

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                We encountered an unexpected error
                {isHydrationError && (
                  <span className="block mt-2 text-sm">
                    This may be caused by a browser extension (like Google Translate or Grammarly).
                    Try disabling extensions or refreshing the page.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message}
              </p>
              <p className="text-xs text-muted-foreground">
                This error has been logged. Please try again or return to the home page.
                If the problem persists, please contact support.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button onClick={this.handleReset} className="w-full" variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// API Error Component for server errors
export function APIErrorDisplay({ error, retry }: { error: string | Error; retry?: () => void }) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-muted dark:bg-muted flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-center text-lg">Service Temporarily Unavailable</CardTitle>
        <CardDescription className="text-center">
          {errorMessage.includes('500')
            ? "We're experiencing technical difficulties. Please try again in a moment."
            : errorMessage}
        </CardDescription>
      </CardHeader>
      {retry && (
        <CardFooter>
          <Button onClick={retry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Connection Error Component for network issues
export function ConnectionErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-center text-lg">Connection Issue</CardTitle>
        <CardDescription className="text-center">
          Unable to establish connection. Please check your internet connection and try again.
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardFooter>
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
