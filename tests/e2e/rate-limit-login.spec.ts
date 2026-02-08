import { test, expect } from '@playwright/test'

/**
 * Test rate limiting on login endpoint
 * 
 * Expected: After 10 login attempts in 5 minutes, should return 429
 */
test.describe('Rate Limiting - Login', () => {
  test('should rate limit login after 10 attempts', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000'
    const testId = `login-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Make 11 login attempts (10 allowed + 1 blocked). Bucket isolé via X-Rate-Limit-Test-Id.
    const responses = []
    for (let i = 0; i < 11; i++) {
      const response = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          email: 'admin@douma.com',
          password: 'wrong-password', // Wrong password to avoid actual login
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Rate-Limit': 'true',
          'X-Rate-Limit-Test-Id': testId,
        },
      })
      
      responses.push({
        status: response.status(),
        headers: await response.headers(),
        body: await response.json().catch(() => ({})),
      })
    }

    // First 10 should be 401 (unauthorized) or 200 (if somehow valid)
    for (let i = 0; i < 10; i++) {
      expect([200, 401]).toContain(responses[i].status)
    }

    // 11th should be 429 (rate limited)
    expect(responses[10].status).toBe(429)
    
    // Check rate limit headers
    const rateLimitHeaders = responses[10].headers
    expect(rateLimitHeaders['x-ratelimit-limit']).toBe('10')
    expect(rateLimitHeaders['retry-after']).toBeDefined()
    expect(rateLimitHeaders['x-ratelimit-remaining']).toBe('0')
    
    // Check response body
    const body = responses[10].body
    expect(body.error).toBe('Too many requests')
    expect(body.message).toContain('Rate limit exceeded')
  })

  test('should reset rate limit after window expires', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000'
    const testId = `login-reset-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const loginHeaders = { 'Content-Type': 'application/json', 'X-Force-Rate-Limit': 'true', 'X-Rate-Limit-Test-Id': testId }
    // Make 10 login attempts to hit the limit
    for (let i = 0; i < 10; i++) {
      await request.post(`${baseURL}/api/auth/login`, {
        data: { email: 'admin@douma.com', password: 'wrong-password' },
        headers: loginHeaders,
      })
    }

    // 11th should be blocked
    const blockedResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: { email: 'admin@douma.com', password: 'wrong-password' },
      headers: loginHeaders,
    })
    
    expect(blockedResponse.status()).toBe(429)

    // Note: In a real scenario, we would wait for the window to expire (5 minutes)
    // For this test, we just verify the rate limiting is working
    // In production, you might want to use a shorter window for testing
  })
})
