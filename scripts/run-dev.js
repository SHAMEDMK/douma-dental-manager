/**
 * Lance "next dev" avec BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA=true
 * pour supprimer l'avertissement baseline-browser-mapping (sans dépendre de cross-env).
 */
const { spawn } = require('child_process');
const path = require('path');

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = 'true';

const root = path.join(__dirname, '..');
// Next.js 16 : binaire dans node_modules/next/dist/bin/next
const nextPath = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextPath, 'dev'], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

child.on('exit', (code) => process.exit(code ?? 0));
