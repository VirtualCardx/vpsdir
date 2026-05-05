/**
 * Pre-build cleanup: kills lingering workerd processes and removes dist/
 * to prevent EPERM errors on Windows when Astro tries to clean the output directory.
 */
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

// Kill lingering workerd processes (Windows-specific)
if (process.platform === 'win32') {
  try {
    execSync('taskkill /f /im workerd.exe', { stdio: 'ignore' });
    // Brief pause to release file handles
    execSync('ping -n 2 127.0.0.1 >nul', { stdio: 'ignore' });
  } catch {
    // No workerd processes running — nothing to do
  }
}

// Remove dist directory if it exists
if (existsSync(distDir)) {
  try {
    rmSync(distDir, { recursive: true, force: true });
    console.log('[clean] Removed dist/');
  } catch (err) {
    console.warn('[clean] Could not fully remove dist/:', err.message);
  }
}
