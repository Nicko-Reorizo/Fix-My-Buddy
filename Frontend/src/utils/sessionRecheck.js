// Confirm an API's 401 before discarding the current account. Multiple polling
// requests share one check; a later login/logout invalidates an older result.
export function createSessionRecheck({ loadSession, onSession, onError }) {
  let revision = 0;
  let pending = null;
  return {
    invalidate() {
      revision += 1;
      pending = null;
    },
    check() {
      if (pending) return pending;
      const version = revision;
      const task = Promise.resolve()
        .then(loadSession)
        .then(user => { if (version === revision) onSession(user); })
        .catch(error => { if (version === revision) onError(error); })
        .finally(() => { if (pending === task) pending = null; });
      pending = task;
      return task;
    },
  };
}
