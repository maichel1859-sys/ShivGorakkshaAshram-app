/*
  Non-blocking environment validation for production readiness.
  Prints warnings for missing vars but exits with code 0
  to avoid changing build/runtime behavior.
*/

// Load env from .env files if present
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {}

const required = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
];

const optional = [
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
];

let ok = true;
for (const key of required) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    ok = false;
    console.warn(`[env] Missing required variable: ${key}`);
  }
}

for (const key of optional) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    console.warn(`[env] Optional variable not set: ${key}`);
  }
}

if (ok) {
  console.log('[env] All required variables present.');
} else {
  console.warn('[env] Some required variables are missing. Application may not function in production.');
}

// Always exit successfully to keep behavior unchanged
process.exit(0);
