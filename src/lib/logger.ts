type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';

function log(level: LogLevel, ...args: unknown[]) {
  if (isProd && (level === 'debug' || level === 'info')) return;
  const c = console as unknown as Record<LogLevel, (...a: unknown[]) => void>;
  c[level](...args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
