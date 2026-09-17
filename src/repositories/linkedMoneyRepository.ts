import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

import type {
  LinkedMoneyOffer,
} from '../types/models';

export type LinkedMoneySourceType =
  | 'business_payroll_run'
  | 'marketplace_payout';

function newKey(): string {
  if (
    typeof globalThis.crypto?.randomUUID
      === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    'linked-money-'
    + Date.now()
    + '-'
    + Math.random()
      .toString(36)
      .slice(2, 18)
  );
}

export async function ensureLinkedMoneyOffer(
  sourceType: LinkedMoneySourceType,
  sourceId: string,
): Promise<{
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'external';
  offerId: string | null;
  recipientUid: string;
}> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'ensureLinkedMoneyOffer',
    );

  const result =
    await call({
      sourceType,
      sourceId,
    });

  return result.data as {
    status:
      | 'pending'
      | 'accepted'
      | 'declined'
      | 'external';
    offerId: string | null;
    recipientUid: string;
  };
}

export async function listLinkedMoneyOffers():
Promise<LinkedMoneyOffer[]> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getLinkedMoneyOffers',
    );

  const result =
    await call({});

  return (
    (
      result.data as {
        offers?: LinkedMoneyOffer[];
      }
    ).offers
    || []
  );
}

export async function respondLinkedMoneyOffer(
  input:
    | {
        offerId: string;
        decision: 'accept';
        accountId: string;
        personalSpaceId: string;
      }
    | {
        offerId: string;
        decision: 'decline';
      },
): Promise<{
  status:
    | 'accepted'
    | 'declined'
    | 'pending';
  offerId: string;
  personalTransactionId?: string | null;
}> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'respondLinkedMoneyOffer',
    );

  const result =
    await call({
      ...input,
      idempotencyKey:
        newKey(),
    });

  return result.data as {
    status:
      | 'accepted'
      | 'declined'
      | 'pending';
    offerId: string;
    personalTransactionId?: string | null;
  };
}
