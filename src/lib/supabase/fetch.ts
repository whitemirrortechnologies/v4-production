/** fetch with a deadline, so a slow or paused database produces an error instead of an endless spinner. */
export function fetchWithTimeout(ms = 12000): typeof fetch {
  return (input, init) => {
    const t = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, t]) : t;
    return fetch(input, { ...init, signal });
  };
}
