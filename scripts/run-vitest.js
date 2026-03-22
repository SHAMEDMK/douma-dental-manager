#!/usr/bin/env node
/**
 * Wrapper for Vitest that fixes "No test suite found" on Windows when cwd
 * uses a lowercase drive letter (e.g. c:\ instead of C:\).
 * See: https://github.com/vitest-dev/vitest/issues/9507
 */
const { execSync } = require('child_process')

let cwd = process.cwd()
if (process.platform === 'win32' && /^[a-z]:/.test(cwd)) {
  cwd = cwd.charAt(0).toUpperCase() + cwd.slice(1)
}
execSync('npx vitest run', { stdio: 'inherit', cwd })
