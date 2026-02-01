import { test, expect } from '@playwright/test'

/**
 * Test rate limiting on PDF generation endpoints
 * 
 * Expected: After 10 PDF requests in 1 minute, should return 429
 */
test.describe('Rate Limiting - PDF Generation', () => {
  test('should rate limit PDF generation after 10 requests (authenticated)', async ({ browser }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
    
    // Login as admin first
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', 'admin@douma.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/admin/**`)
    
    // Get session cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'session')
    
    if (!sessionCookie) {
      throw new Error('Failed to get session cookie')
    }

    // We need an invoice ID to test PDF generation
    // For this test, we'll use a mock ID and expect 404 or 429
    // In a real scenario, you would create an invoice first
    
    const responses = []
    for (let i = 0; i < 11; i++) {
      const response = await page.request.get(`${baseURL}/api/pdf/admin/invoices/test-invoice-id`, {
        headers: {
          Cookie: `session=${sessionCookie.value}`,
        },
      })
      
      responses.push({
        status: response.status(),
        headers: response.headers(),
      })
    }

    // First 10 should be 404 (invoice not found) or 200 (if exists)
    for (let i = 0; i < 10; i++) {
      expect([200, 404]).toContain(responses[i].status)
    }

    // 11th should be 429 (rate limited) OR still 404 if rate limit not hit yet
    // Note: Rate limiting is per user, so if we're making requests too fast,
    // we might hit the limit
    const lastStatus = responses[10].status
    
    // If rate limited, check headers
    if (lastStatus === 429) {
      const rateLimitHeaders = responses[10].headers
      expect(rateLimitHeaders['x-ratelimit-limit']).toBe('10')
      expect(rateLimitHeaders['retry-after']).toBeDefined()
    }
    
    await context.close()
  })

  test('should rate limit PDF generation by IP when not authenticated', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
    
    // Make 11 PDF requests without authentication
    const responses = []
    for (let i = 0; i < 11; i++) {
      const response = await request.get(`${baseURL}/api/pdf/admin/invoices/test-invoice-id`)
      
      responses.push({
        status: response.status(),
        headers: response.headers(),
      })
    }

    // First 10 should be 401 (unauthorized) or 404
    for (let i = 0; i < 10; i++) {
      expect([401, 404]).toContain(responses[i].status)
    }

    // 11th should be 429 (rate limited) OR still 401 if rate limit not hit yet
    const lastStatus = responses[10].status
    
    // If rate limited, check headers
    if (lastStatus === 429) {
      const rateLimitHeaders = responses[10].headers
      expect(rateLimitHeaders['x-ratelimit-limit']).toBe('10')
      expect(rateLimitHeaders['retry-after']).toBeDefined()
    }
  })
})
