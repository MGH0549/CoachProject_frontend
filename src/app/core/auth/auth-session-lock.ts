// Refresh cookies rotate across all same-origin tabs. Hold the lock until the response
// has updated the browser cookie; never share or persist access/refresh tokens.
export function withAuthSessionLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request('forma-auth-session', work) : work();
}
