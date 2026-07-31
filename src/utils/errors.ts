interface ErrorLike {
  code?: string;
  message?: string;
  details?: unknown;
}

const friendlyMessages: Record<string, string> = {
  'auth/invalid-credential': 'The email or password is not correct. Use “Continue with Google” when this account uses Google sign-in.',
  'auth/unauthorized-domain': 'Sign-in is not ready for this website yet. Contact the BajetBN administrator.',
  'auth/network-request-failed': 'BajetBN could not connect. Check your internet and try again.',
  'functions/unauthenticated': 'Your session has ended. Sign in again and retry.',
  'functions/permission-denied': 'You are not allowed to do this.',
  'functions/not-found': 'We could not find this item. Refresh and try again.',
  'functions/already-exists': 'This item already exists.',
  'functions/failed-precondition': 'This cannot be done yet. Refresh the page and check the item again.',
  'functions/deadline-exceeded': 'This invitation has expired. Ask the Space owner for a new invitation.',
  'functions/unavailable': 'BajetBN is temporarily unavailable. Check your connection and try again.',
  'permission-denied': 'You do not have access to this information.',
  'firestore/permission-denied': 'You do not have access to this information.',
  'unavailable': 'BajetBN could not connect. Check your internet and try again.',
  'firestore/unavailable': 'BajetBN could not connect. Check your internet and try again.',
  'storage/unauthorized': 'You are not allowed to open or upload this file.',
  'storage/retry-limit-exceeded': 'The file could not be uploaded. Check your internet and try again.',
  'storage/quota-exceeded': 'File uploads are temporarily unavailable. Try again later.',
};

function makeMessageSimple(message: string): string {
  if (/requires an index|create it here|index is currently building/i.test(message)) {
    return 'This page is getting ready. Please try again in a few minutes.';
  }
  if (/network|failed to fetch|offline/i.test(message)) {
    return 'BajetBN could not connect. Check your internet and try again.';
  }
  if (/internal/i.test(message) && message.trim().length < 80) {
    return 'BajetBN could not finish this action. Refresh the page and try again.';
  }

  return message
    .replace(/missing or insufficient permissions/gi, 'You do not have access to do this')
    .replace(/permission denied/gi, 'You are not allowed to do this')
    .replace(/legacy settlement/gi, 'old payment')
    .replace(/payment claim/gi, 'payment submitted')
    .replace(/settlement/gi, 'payment')
    .replace(/outstanding amount/gi, 'amount left to pay')
    .replace(/outstanding/gi, 'left to pay')
    .replace(/commitment/gi, 'bill or instalment')
    .replace(/ledger entries?/gi, 'account records')
    .replace(/ledger/gi, 'account activity')
    .replace(/reversal/gi, 'undo record')
    .replace(/reverse/gi, 'undo')
    .replace(/finali[sz]e/gi, 'finish')
    .replace(/idempotency key/gi, 'duplicate protection')
    .replace(/failed precondition/gi, 'this cannot be done yet');
}

export function getErrorMessage(error: unknown): string {
  const candidate = error as ErrorLike | null;
  const code = candidate?.code?.toLowerCase();
  if (code?.includes('failed-precondition') && typeof candidate?.message === 'string' && candidate.message.trim()) {
    return makeMessageSimple(candidate.message.replace(/^Firebase:\s*/i, '').replace(/^Error\s*\([^)]*\)\.?\s*/i, '').trim());
  }
  if (code && friendlyMessages[code]) return friendlyMessages[code];
  if (code?.includes('permission-denied') || code?.includes('unauthorized')) return 'You do not have access to do this.';
  if (code?.includes('unavailable') || code?.includes('network')) return 'BajetBN could not connect. Check your internet and try again.';
  if (typeof candidate?.details === 'string' && candidate.details.trim()) return makeMessageSimple(candidate.details.trim());
  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return makeMessageSimple(candidate.message
      .replace(/^Firebase:\s*/i, '')
      .replace(/^Error\s*\([^)]*\)\.?\s*/i, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim());
  }
  return 'Something went wrong. Please try again.';
}
