export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args as []);
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.warn(...args as []);
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.error(...args as []);
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug(...args as []);
  },
};

