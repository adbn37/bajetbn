/**
 * Phase 11.2: owner-scoped, in-flight-only request sharing.
 * A settled read is ALWAYS removed; this is never a data or balance cache.
 */
export function singleFlightByOwnerV112<T>(
  read: (ownerId: string) => Promise<T>,
): (ownerId: string) => Promise<T> {
  const pending = new Map<string, Promise<T>>();

  return (ownerId: string): Promise<T> => {
    const current = pending.get(ownerId);
    if (current) return current;

    // Call the repository on a microtask to turn synchronous throws into
    // Promise rejections and make concurrent requests share one promise.
    const request = Promise.resolve().then(() => read(ownerId));
    pending.set(ownerId, request);

    const clear = () => {
      if (pending.get(ownerId) === request) {
        pending.delete(ownerId);
      }
    };
    // Both success and failure evict the in-flight promise. The caller's
    // original promise retains its resolution or rejection unchanged.
    void request.then(clear, clear);
    return request;
  };
}
