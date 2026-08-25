(() => {
  const ALLOWED_ORIGINS = new Set([
    'https://bajetbn.com',
    'https://www.bajetbn.com',
  ]);

  const params = new URLSearchParams(
    window.location.search,
  );

  const rawReturnTo = params.get('returnTo');

  if (!rawReturnTo) {
    window.location.replace('/');
    return;
  }

  let target;

  try {
    target = new URL(rawReturnTo);
  } catch {
    window.location.replace('/');
    return;
  }

  if (
    !ALLOWED_ORIGINS.has(target.origin)
    || target.origin === window.location.origin
  ) {
    window.location.replace('/');
    return;
  }

  // The previous origin has now lost its active page client.
  // Give unregister() a brief opportunity to finish before
  // returning for a clean, uncontrolled navigation.
  window.setTimeout(() => {
    window.location.replace(target.toString());
  }, 250);
})();
