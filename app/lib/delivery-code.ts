/**
 * Generate a unique delivery confirmation code
 * Format: 6-digit code (000000-999999)
 */
export function generateDeliveryConfirmationCode(): string {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  return code
}

/**
 * Validate delivery confirmation code format
 */
export function isValidDeliveryCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}
