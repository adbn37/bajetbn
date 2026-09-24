import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

export type AdbnCustomerLinkStatus =
  | 'pending'
  | 'accepted'
  | 'declined';

export interface AdbnCustomerLink {
  id: string;
  displayId?: string;
  businessSpaceId: string;
  businessSpaceName: string;
  adbnCustomerId: string;
  customerNo: string;
  customerName: string;
  targetEmail: string;
  invitedUserUid?: string | null;
  recipientUid?: string | null;
  targetSpaceId?: string | null;
  targetSpaceName?: string | null;
  targetSpaceType?:
    | 'personal'
    | 'household'
    | null;
  status: AdbnCustomerLinkStatus;
  invitedAt?: unknown;
  acceptedAt?: unknown;
  declinedAt?: unknown;
  updatedAt?: unknown;
}

function newKey() {
  if (
    typeof globalThis.crypto?.randomUUID
      === 'function'
  ) {
    return (
      'adbn-link-'
      + globalThis.crypto
        .randomUUID()
        .replace(/-/g, '')
    );
  }

  return (
    'adbn-link-'
    + Date.now().toString(36)
    + Math.random()
      .toString(36)
      .slice(2, 18)
  );
}

export async function createAdbnCustomerLinkInvitation(
  input: {
    businessSpaceId: string;
    adbnCustomerId: string;
    customerNo?: string;
    customerName: string;
    targetEmail: string;
  },
): Promise<{
  linkId: string;
  status: AdbnCustomerLinkStatus;
  targetEmail: string;
  recipientRegistered: boolean;
}> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'createAdbnCustomerLinkInvitation',
    );

  const result =
    await call({
      ...input,
      customerNo:
        input.customerNo?.trim()
        || '',
      customerName:
        input.customerName.trim(),
      targetEmail:
        input.targetEmail
          .trim()
          .toLowerCase(),
      idempotencyKey:
        newKey(),
    });

  return result.data as {
    linkId: string;
    status: AdbnCustomerLinkStatus;
    targetEmail: string;
    recipientRegistered: boolean;
  };
}

export async function listAdbnCustomerLinksForBusiness(
  businessSpaceId: string,
): Promise<AdbnCustomerLink[]> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getAdbnCustomerLinksForBusiness',
    );

  const result =
    await call({
      businessSpaceId,
    });

  return (
    (
      result.data as {
        links?: AdbnCustomerLink[];
      }
    ).links
    || []
  );
}

export async function listMyAdbnCustomerLinks():
Promise<AdbnCustomerLink[]> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getMyAdbnCustomerLinks',
    );

  const result =
    await call({});

  return (
    (
      result.data as {
        links?: AdbnCustomerLink[];
      }
    ).links
    || []
  );
}

export async function respondAdbnCustomerLinkInvitation(
  input:
    | {
        linkId: string;
        decision: 'accept';
        targetSpaceId: string;
      }
    | {
        linkId: string;
        decision: 'decline';
      },
): Promise<{
  linkId: string;
  status: AdbnCustomerLinkStatus;
  targetSpaceId?: string | null;
}> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'respondAdbnCustomerLinkInvitation',
    );

  const result =
    await call({
      ...input,
      idempotencyKey:
        newKey(),
    });

  return result.data as {
    linkId: string;
    status: AdbnCustomerLinkStatus;
    targetSpaceId?: string | null;
  };
}
