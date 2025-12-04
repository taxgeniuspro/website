/**
 * API v1: Shipping Calculate Endpoint
 *
 * @version 1.0.0
 * @stable Yes
 */

import { type NextRequest, NextResponse } from 'next/server'

export { POST } from '@/app/api/shipping/calculate/route'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('API-Version', '1.0')
  response.headers.set('X-API-Version', 'v1')
  return response
}
