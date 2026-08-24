import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import {
  httpsCallable,
} from 'firebase/functions';
import {
  requireFirebase,
} from '../services/firebase';

export type SubscriptionRequestStatus =
  | 'awaiting_payment'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface SubscriptionRequest {
  id: string;
  reference: string;
  uid: string;
  email: string;
  fullName: string;
  planKey: string;
  planLabel: string;
  months: 1 | 3 | 6 | 12;
  amountMinor: number;
  currency: 'BND';
  status: SubscriptionRequestStatus;
  proofPath: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
}

export async function createSubscriptionRequest(
  planKey: string,
): Promise<SubscriptionRequest> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    { planKey: string },
    { request: SubscriptionRequest }
  >(
    functions,
    'createSubscriptionRequest',
  );

  const result = await callable({
    planKey,
  });

  return result.data.request;
}

export async function uploadSubscriptionPaymentProof(
  input: {
    uid: string;
    requestId: string;
    file: File;
  },
): Promise<string> {
  if (
    !input.file.type.startsWith('image/')
    && input.file.type !== 'application/pdf'
  ) {
    throw new Error(
      'Upload an image or PDF payment proof.',
    );
  }

  if (
    input.file.size <= 0
    || input.file.size >= 10 * 1024 * 1024
  ) {
    throw new Error(
      'Payment proof must be smaller than 10 MB.',
    );
  }

  const { storage } = requireFirebase();

  const safeName =
    input.file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120)
    || 'payment-proof';

  const proofPath =
    `subscription-proofs/${input.uid}/${input.requestId}/`
    + `${crypto.randomUUID()}-${safeName}`;

  await uploadBytes(
    ref(storage, proofPath),
    input.file,
    {
      contentType: input.file.type,
    },
  );

  return proofPath;
}

export async function submitSubscriptionPaymentProof(
  requestId: string,
  proofPath: string,
): Promise<SubscriptionRequest> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    {
      requestId: string;
      proofPath: string;
    },
    {
      request: SubscriptionRequest;
    }
  >(
    functions,
    'submitSubscriptionPaymentProof',
  );

  const result = await callable({
    requestId,
    proofPath,
  });

  return result.data.request;
}

export async function listMySubscriptionRequests():
Promise<SubscriptionRequest[]> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    void,
    { requests: SubscriptionRequest[] }
  >(
    functions,
    'listMySubscriptionRequests',
  );

  const result = await callable();

  return result.data.requests;
}

export async function listAdminSubscriptionRequests():
Promise<SubscriptionRequest[]> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    void,
    { requests: SubscriptionRequest[] }
  >(
    functions,
    'adminListSubscriptionRequests',
  );

  const result = await callable();

  return result.data.requests;
}

export async function reviewSubscriptionRequest(
  input: {
    requestId: string;
    decision: 'approve' | 'reject';
    note?: string;
  },
): Promise<void> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    {
      requestId: string;
      decision: 'approve' | 'reject';
      note?: string;
    },
    unknown
  >(
    functions,
    'adminReviewSubscriptionRequest',
  );

  await callable(input);
}

export async function getSubscriptionProofUrl(
  proofPath: string,
): Promise<string> {
  const { storage } = requireFirebase();

  return getDownloadURL(
    ref(storage, proofPath),
  );
}
