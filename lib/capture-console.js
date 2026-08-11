function formatArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

/**
 * Capture console.log/info/warn/error/debug while fn runs.
 * Restores originals in finally. On throw, returns { error, logs }.
 */
async function withCapturedConsole(fn) {
  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  const originals = {};
  const logs = [];

  for (const level of levels) {
    originals[level] = console[level];
    console[level] = (...args) => {
      logs.push({
        level,
        message: args.map(formatArg).join(' '),
      });
      originals[level].apply(console, args);
    };
  }

  try {
    const result = await fn();
    return { result, logs, error: null };
  } catch (error) {
    return { result: null, logs, error };
  } finally {
    for (const level of levels) {
      console[level] = originals[level];
    }
  }
}

module.exports = { withCapturedConsole };
