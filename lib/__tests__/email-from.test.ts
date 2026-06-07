import { describe, it, expect, afterEach } from 'vitest'
import {
  getEmailDomain,
  humanizeResendError,
  isPublicMailDomain,
  resolveEmailFrom,
} from '../email-from'

describe('email-from', () => {
  const originalResendFrom = process.env.RESEND_FROM
  const originalResendKey = process.env.RESEND_API_KEY

  afterEach(() => {
    if (originalResendFrom !== undefined) process.env.RESEND_FROM = originalResendFrom
    else delete process.env.RESEND_FROM
    if (originalResendKey !== undefined) process.env.RESEND_API_KEY = originalResendKey
    else delete process.env.RESEND_API_KEY
  })

  it('detects public mail domains', () => {
    expect(isPublicMailDomain('gmail.com')).toBe(true)
    expect(isPublicMailDomain('shamed.ma')).toBe(false)
  })

  it('prefers RESEND_FROM when set', () => {
    process.env.RESEND_FROM = 'SHAMED <noreply@shamed.ma>'
    process.env.RESEND_API_KEY = 're_real_key_for_test'
    const result = resolveEmailFrom({
      companyName: 'SHAMED',
      companyEmail: 'contact@gmail.com',
    })
    expect(result).toEqual({ from: 'SHAMED <noreply@shamed.ma>' })
  })

  it('refuses gmail as from when RESEND_FROM missing in production', () => {
    delete process.env.RESEND_FROM
    process.env.RESEND_API_KEY = 're_real_key_for_test'
    const result = resolveEmailFrom({
      companyName: 'SHAMED',
      companyEmail: 'contact@gmail.com',
    })
    expect('error' in result).toBe(true)
  })

  it('allows company domain when RESEND_FROM missing', () => {
    delete process.env.RESEND_FROM
    process.env.RESEND_API_KEY = 're_real_key_for_test'
    const result = resolveEmailFrom({
      companyName: 'SHAMED',
      companyEmail: 'contact@shamed.ma',
    })
    expect(result).toEqual({ from: 'SHAMED <contact@shamed.ma>' })
  })

  it('humanizes Resend domain verification errors', () => {
    const msg = humanizeResendError(
      'The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains'
    )
    expect(msg).toMatch(/RESEND_FROM/)
    expect(msg).toMatch(/gmail/i)
  })

  it('parses domain from formatted from address', () => {
    expect(getEmailDomain('SHAMED <noreply@shamed.ma>')).toBe('shamed.ma')
  })
})
