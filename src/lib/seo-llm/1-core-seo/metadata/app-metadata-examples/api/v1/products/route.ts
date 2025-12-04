/**
 * API v1: Products Endpoint
 *
 * This is the stable v1 API endpoint for products.
 * Use this endpoint for all new integrations.
 *
 * @version 1.0.0
 * @stable Yes
 */

import { type NextRequest, NextResponse } from 'next/server'

// Import the existing products handler
// In production, this would be a separate implementation
// For now, we reuse the existing logic
export { GET, POST } from '@/app/api/products/route'

// Middleware to add version headers
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('API-Version', '1.0')
  response.headers.set('X-API-Version', 'v1')

  return response
}
