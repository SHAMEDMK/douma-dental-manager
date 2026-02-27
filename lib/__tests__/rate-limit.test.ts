import { describe, it, expect } from 'vitest'
import { getClientIP } from '../rate-limit'

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request('http://localhost', { headers: new Headers(headers) })
}

describe('getClientIP', () => {
  it('uses first IP from x-forwarded-for and trims spaces', () => {
    const req = requestWithHeaders({ 'x-forwarded-for': '  1.2.3.4  , 10.0.0.1' })
    expect(getClientIP(req)).toBe('1.2.3.4')
  })

  it('uses x-real-ip when x-forwarded-for is absent', () => {
    const req = requestWithHeaders({ 'x-real-ip': ' 192.168.1.1 ' })
    expect(getClientIP(req)).toBe('192.168.1.1')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = requestWithHeaders({
      'x-forwarded-for': '2.3.4.5',
      'x-real-ip': '192.168.1.1',
    })
    expect(getClientIP(req)).toBe('2.3.4.5')
  })

  it('returns unknown when no IP headers are present', () => {
    const req = requestWithHeaders({})
    expect(getClientIP(req)).toBe('unknown')
  })
})
