interface ErrorLike {
  code?: string;
  message?: string;
  details?: unknown;
}

const friendlyMessages: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password. Use “Continue with Google” if this account was registered with Google.',
  'auth/unauthorized-domain': 'This website is not yet authorised for sign-in. Contact the BajetBN administrator.',
  'functions/unauthenticated': 'Your session has expired. Sign in again and retry.',
  'functions/permission-denied': 'You are not allowed to do this.',
  'functions/not-found': 'We could not find this item. Refresh and try again.',
  'functions/already-exists': 'This item already exists.',
  'functions/failed-precondition': 'This cannot be done yet. Refresh the page and check the item again.',
  'functions/deadline-exceeded': 'This invitation has expired. Ask the Space owner for a new invitation.',
  'functions/unavailable': 'The BajetBN service is temporarily unavailable. Check your connection and retry.',
};

function makeMessageSimple(message: string): string {
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
  if (candidate?.code && friendlyMessages[candidate.code]) return friendlyMessages[candidate.code];
  if (typeof candidate?.details === 'string' && candidate.details.trim()) return makeMessageSimple(candidate.details.trim());
  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return makeMessageSimple(candidate.message
      .replace(/^Firebase:\s*/i, '')
      .replace(/^Error\s*\([^)]*\)\.?\s*/i, '')
      .trim());
  }
  return 'Something went wrong. Please try again.';
}
