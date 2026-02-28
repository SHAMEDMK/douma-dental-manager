import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Ref used by resend mock so it can be set after module load (mock factory runs before resendSendMock is defined)
const resendSendRef: { send: ReturnType<typeof vi.fn> | null } = { send: null }

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = {
      send: (...args: unknown[]) => resendSendRef.send!(...args),
    }
    return this
  }),
}))

import { getAppUrl } from '../email'

describe('getAppUrl', () => {
  const originalAppUrl = process.env.APP_URL
  const originalNextPublic = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (originalAppUrl !== undefined) process.env.APP_URL = originalAppUrl
    else delete process.env.APP_URL
    if (originalNextPublic !== undefined) process.env.NEXT_PUBLIC_APP_URL = originalNextPublic
    else delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('returns APP_URL when set (used for invitation links in prod)', () => {
    process.env.APP_URL = 'https://app.example.com'
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(getAppUrl()).toBe('https://app.example.com')
  })

  it('returns NEXT_PUBLIC_APP_URL when APP_URL is not set', () => {
    delete process.env.APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://portal.example.com'
    expect(getAppUrl()).toBe('https://portal.example.com')
  })

  it('prefers APP_URL over NEXT_PUBLIC_APP_URL', () => {
    process.env.APP_URL = 'https://api.example.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://other.example.com'
    expect(getAppUrl()).toBe('https://api.example.com')
  })

  it('strips trailing slash from URL', () => {
    process.env.APP_URL = 'https://app.example.com/'
    expect(getAppUrl()).toBe('https://app.example.com')
  })

  it('returns localhost when neither APP_URL nor NEXT_PUBLIC_APP_URL is set', () => {
    delete process.env.APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(getAppUrl()).toBe('http://localhost:3000')
  })
})

describe('sendClientInvitationEmail (Resend)', () => {
  beforeEach(() => {
    resendSendRef.send = vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
    vi.stubEnv('RESEND_API_KEY', 're_test_key_for_unit_test')
  })

  it('calls Resend when RESEND_API_KEY is set', async () => {
    const { sendClientInvitationEmail } = await import('../email')
    await sendClientInvitationEmail({
      to: 'client@example.com',
      clientName: 'Test Client',
      invitationLink: 'https://app.example.com/invite/abc123',
    })
    expect(resendSendRef.send).toHaveBeenCalledTimes(1)
    const call = (resendSendRef.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.to).toBe('client@example.com')
    expect(call.subject).toContain('Invitation')
    expect(call.html).toContain('https://app.example.com/invite/abc123')
  })
})
