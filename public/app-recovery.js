(() => {
  const RECOVERY_KEY = 'bajetbn:deployment-recovery';
  const RECOVERY_PARAM = '__bajetbn_reload';
  const RECOVERY_WINDOW_MS = 60_000;

  // This path intentionally does not exist as a physical build file.
  // Cloudflare's SPA fallback serves the newest index.html for it, while
  // old BajetBN service workers ignore it because it was never precached.
  const FRESH_SHELL_PATH = '/__bajetbn_fresh_shell__';

  let memoryAttemptAt = 0;

  function recoveryDestination(now) {
    // Stay on the same origin. The current stale worker is unregistered first,
    // then this clean navigation carries the recovery flag. app-recovery.js is
    // network-only, so the next document receives the newest recovery logic
    // even if an old application shell briefly answers the navigation.
    const returnUrl = new URL(window.location.href);

    returnUrl.searchParams.set(
      RECOVERY_PARAM,
      String(now),
    );

    return returnUrl.toString();
  }

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

  function replaceWithFreshNetworkShell() {
    const currentUrl = new URL(window.location.href);

    if (!currentUrl.searchParams.has(RECOVERY_PARAM)) {
      return false;
    }

    try {
      const shellUrl = new URL(
        FRESH_SHELL_PATH,
        window.location.origin,
      );

      shellUrl.searchParams.set(
        'fresh',
        String(Date.now()),
      );

      // Synchronous XHR is intentional here. This runs only during deployment
      // recovery and blocks the old HTML parser before it can execute stale
      // lazy-loaded module references.
      //
      // The special pathname is not in the service-worker precache, so even an
      // old controlling worker lets this request reach Cloudflare.
      const request = new XMLHttpRequest();

      request.open(
        'GET',
        shellUrl.toString(),
        false,
      );

      request.setRequestHeader(
        'Cache-Control',
        'no-cache',
      );

      request.send(null);

      if (
        request.status < 200
        || request.status >= 300
      ) {
        throw new Error(
          `Fresh shell HTTP ${request.status}`,
        );
      }

      const html = String(
        request.responseText || '',
      );

      if (
        !html.includes('<div id="root"></div>')
        || !html.includes('type="module"')
      ) {
        throw new Error(
          'Fresh shell response was not BajetBN index.html.',
        );
      }

      currentUrl.searchParams.delete(
        RECOVERY_PARAM,
      );

      clearAttempt();

      window.history.replaceState(
        window.history.state,
        '',
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      );

      document.open();
      document.write(html);
      document.close();

      return true;
    } catch (error) {
      console.warn(
        '[BajetBN] Fresh application shell recovery failed.',
        error,
      );

      // Allow the normal deployment recovery path to try once if the direct
      // fresh-shell replacement could not complete.
      clearAttempt();

      return false;
    }
  }

  if (replaceWithFreshNetworkShell()) {
    return;
  }

  async function clearStaleApplicationShell() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope.startsWith(`${window.location.origin}/`))
            .map((registration) => registration.unregister()),
        );
      }
    } catch (error) {
      console.warn('[BajetBN] Could not unregister stale service worker.', error);
    }

    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('bajetbn-shell-'))
            .map((key) => window.caches.delete(key)),
        );
      }
    } catch (error) {
      console.warn('[BajetBN] Could not clear stale application cache.', error);
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

    void (async () => {
      await clearStaleApplicationShell();

      window.location.replace(
        recoveryDestination(now),
      );
    })();

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
