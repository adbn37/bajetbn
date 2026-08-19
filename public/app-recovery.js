(() => {
  const RECOVERY_KEY = 'bajetbn:deployment-recovery';
  const RECOVERY_PARAM = '__bajetbn_reload';
  const RECOVERY_WINDOW_MS = 60_000;
  let memoryAttemptAt = 0;

  function messageFor(value) {
    if (value && typeof value === 'object' && 'message' in value) {
      return String(value.message || '');
    }
    return String(value || '');
  }

  function isDeploymentAssetError(value) {
    return /Failed to fetch dynamically imported module|Importing a module script failed|Failed to load module script|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(
      messageFor(value),
    );
  }

  function lastAttemptAt() {
    try {
      return Number(window.sessionStorage.getItem(RECOVERY_KEY) || '0');
    } catch {
      return memoryAttemptAt;
    }
  }

  function rememberAttempt(now) {
    memoryAttemptAt = now;
    try {
      window.sessionStorage.setItem(RECOVERY_KEY, String(now));
    } catch {
      // In-memory guard remains available.
    }
  }

  function clearAttempt() {
    memoryAttemptAt = 0;
    try {
      window.sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      // Ignore storage restrictions.
    }
  }

  function recover(value) {
    if (!isDeploymentAssetError(value)) return false;

    const now = Date.now();
    const previous = lastAttemptAt();
    if (Number.isFinite(previous) && previous > 0 && now - previous < RECOVERY_WINDOW_MS) {
      console.error('[BajetBN] Deployment recovery already attempted.', value);
      return false;
    }

    rememberAttempt(now);
    const url = new URL(window.location.href);
    url.searchParams.set(RECOVERY_PARAM, String(now));
    window.location.replace(url.toString());
    return true;
  }

  window.addEventListener('vite:preloadError', (event) => {
    if (recover(event.payload || event)) {
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (recover(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLScriptElement &&
        target.src &&
        /\/assets\/.*\.js(?:[?#]|$)/i.test(target.src)
      ) {
        recover(new Error(`Failed to load module script: ${target.src}`));
      }
    },
    true,
  );

  window.setTimeout(() => {
    clearAttempt();
    const url = new URL(window.location.href);
    if (url.searchParams.has(RECOVERY_PARAM)) {
      url.searchParams.delete(RECOVERY_PARAM);
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, RECOVERY_WINDOW_MS);
})();
