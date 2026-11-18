/**
 * Development-only stage timer. `createTimer(false)` returns a no-op, so production builds
 * log nothing. Pass `import.meta.env.DEV` (extension) or `process.env.NODE_ENV !== "production"` (web).
 */
export function createTimer(enabled: boolean, label: string, log: (line: string) => void = console.debug) {
  const start = Date.now();
  return (stage: string): void => {
    if (enabled) log(`[rts] ${label} ${stage} +${Date.now() - start}ms`);
  };
}
