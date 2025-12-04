import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    // Test 1: Capture a message
    Sentry.captureMessage('Sentry test endpoint accessed!', 'info')

    // Test 2: Add a breadcrumb
    Sentry.addBreadcrumb({
      message: 'Testing Sentry breadcrumbs',
      category: 'test',
      level: 'info',
    })

    // Test 3: Throw an error to test error tracking
    throw new Error('🎯 TEST ERROR: Sentry is working! This is a test error.')
  } catch (error) {
    // Capture the error
    Sentry.captureException(error)

    // Return success (we caught it)
    return NextResponse.json({
      success: true,
      message: 'Sentry test complete! Check your Sentry dashboard at https://sentry.io',
      tests: {
        message: 'Captured info message ✅',
        breadcrumb: 'Added test breadcrumb ✅',
        error: 'Captured test error ✅',
      },
      nextSteps: [
        '1. Go to https://sentry.io',
        '2. Click on your project: javascript-nextjs',
        '3. Check the "Issues" tab',
        '4. You should see the test error with breadcrumbs',
      ],
    })
  }
}
