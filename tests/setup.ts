import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Note: afterEach(cleanup) removed — caused "Vitest failed to find the runner" when run
// in setupFiles (Vitest 4.x). Add cleanup in test files that use render() if needed.

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js server components
vi.mock('next/server', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))
