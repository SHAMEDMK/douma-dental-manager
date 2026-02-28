import { NextRequest } from 'next/server'

/**
 * Returns the request ID from the request (set by middleware or forwarded by proxy).
 * Use for logging and for setting x-request-id on responses when needed.
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || crypto.randomUUID()
}
