interface ErrorLike {
  code?: string;
  message?: string;
  details?: unknown;
}

const friendlyMessages: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password. Use “Continue with Google” if this account was registered with Google.',
  'auth/unauthorized-domain': 'This website is not yet authorised for sign-in. Contact the BajetBN administrator.',
  'functions/unauthenticated': 'Your session has expired. Sign in again and retry.',
  'functions/permission-denied': 'You do not have permission to complete this action.',
  'functions/not-found': 'The selected record could not be found. Refresh and try again.',
  'functions/already-exists': 'This record already exists.',
  'functions/failed-precondition': 'This action cannot be completed with the current record state.',
  'functions/unavailable': 'The BajetBN service is temporarily unavailable. Check your connection and retry.',
};

export function getErrorMessage(error: unknown): string {
  const candidate = error as ErrorLike | null;
  if (candidate?.code && friendlyMessages[candidate.code]) return friendlyMessages[candidate.code];
  if (typeof candidate?.details === 'string' && candidate.details.trim()) return candidate.details;
  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return candidate.message
      .replace(/^Firebase:\s*/i, '')
      .replace(/^Error\s*\([^)]*\)\.?\s*/i, '')
      .trim();
  }
  return 'Something went wrong. Please try again.';
}
